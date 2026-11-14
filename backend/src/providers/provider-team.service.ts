import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MAIL_SENDER, type MailSender } from '../auth/mail/mail-sender';
import { assertCanJoinProviderTeam } from '../auth/account-kind';
import type {
  AcceptProviderInvitationDto,
  InviteProviderMemberDto,
} from './dto/provider-team.dto';
import { privateInvitationSelect } from './provider-team-select';
import { requireJobTitle } from './provider-job-title';
import { formatUserName } from './provider-display-name';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const INVALID_INVITATION =
  'Приглашение недействительно или срок его действия истёк. Попросите отправить новое.';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class ProviderTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
  ) {}

  private async requireOwner(
    tx: Prisma.TransactionClient,
    userId: string,
    providerId: string,
  ) {
    const member = await tx.providerMember.findUnique({
      where: { providerId_userId: { providerId, userId } },
      select: { role: true, status: true },
    });
    if (member?.role !== 'OWNER' || member.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Приглашать сотрудников и управлять командой может только владелец профиля',
      );
    }
  }

  async invite(
    actorUserId: string,
    providerId: string,
    input: InviteProviderMemberDto,
  ) {
    const email = input.email.trim().toLowerCase();
    const jobTitle = requireJobTitle(input.jobTitle);
    if (input.role !== 'MANAGER' && input.role !== 'EMPLOYEE')
      throw new BadRequestException('Выберите роль сотрудника');
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await this.requireOwner(tx, actorUserId, providerId);
      // Serialize invitations for this profile, including concurrent resends.
      await tx.$queryRaw`SELECT "id" FROM "Provider" WHERE "id" = ${providerId}::uuid FOR UPDATE`;
      const provider = await tx.provider.findUnique({
        where: { id: providerId },
        select: { name: true },
      });
      if (!provider)
        throw new NotFoundException('Профиль исполнителя не найден');
      const recipient = await tx.user.findUnique({
        where: { email },
        select: { id: true, accountKind: true },
      });
      if (recipient) {
        if (recipient.accountKind !== 'PROVIDER') {
          throw new BadRequestException(
            'Этот email используется в кабинете клиента. Укажите email аккаунта исполнителя.',
          );
        }
        const existing = await tx.providerMember.findUnique({
          where: { providerId_userId: { providerId, userId: recipient.id } },
          select: { role: true, status: true },
        });
        if (existing?.role === 'OWNER' || existing?.status === 'ACTIVE') {
          throw new ConflictException('Этот пользователь уже в команде');
        }
      }
      const previous = await tx.providerTeamInvitation.findUnique({
        where: { providerId_email: { providerId, email } },
        select: { sentAt: true, revokedAt: true },
      });
      if (
        previous &&
        !previous.revokedAt &&
        now.getTime() - previous.sentAt.getTime() < RESEND_COOLDOWN_MS
      ) {
        throw new ConflictException(
          'Приглашение уже отправлено. Повторить отправку можно через минуту.',
        );
      }
      const data = {
        invitedById: actorUserId,
        jobTitle,
        role: input.role,
        tokenHash,
        expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
        sentAt: now,
        acceptedAt: null,
        acceptedById: null,
        revokedAt: null,
      };
      const invitation = await tx.providerTeamInvitation.upsert({
        where: { providerId_email: { providerId, email } },
        create: { providerId, email, ...data },
        update: data,
        select: privateInvitationSelect,
      });
      return { invitation, providerName: provider.name };
    });

    const origin = (
      process.env.FRONTEND_URL ?? 'http://localhost:4000'
    ).replace(/\/$/, '');
    const returnTo = `/team-invitations/${token}`;
    const signIn = `${origin}/signin?returnTo=${encodeURIComponent(returnTo)}`;
    const signUp = `${origin}/signup?account=provider&returnTo=${encodeURIComponent(returnTo)}`;
    try {
      await this.mail.send({
        to: email,
        subject: `Приглашение в команду «${result.providerName}» — Земледел`,
        text: [
          `Вас приглашают в команду исполнителя «${result.providerName}» на Земледеле.`,
          `Должность: ${jobTitle}.`,
          `Роль: ${input.role === 'MANAGER' ? 'менеджер — управление кабинетом исполнителя' : 'сотрудник — работа с назначенными заявками'}.`,
          '',
          `Посмотреть и принять приглашение: ${origin}${returnTo}`,
          '',
          `Уже есть аккаунт исполнителя? Войдите: ${signIn}`,
          `Ещё нет аккаунта? Зарегистрируйтесь: ${signUp}`,
          '',
          `Используйте email ${email}. Ссылка действует 7 дней.`,
          'После принятия приглашения ваше имя, фото и должность будут видны в команде исполнителя.',
          'Если приглашение отправлено по ошибке, просто проигнорируйте письмо.',
        ].join('\n'),
      });
    } catch {
      // Do not leave a working invitation or report delivery after a mail failure.
      await this.prisma.providerTeamInvitation.deleteMany({
        where: { id: result.invitation.id, tokenHash, acceptedAt: null },
      });
      throw new BadGatewayException(
        'Не удалось отправить приглашение по почте. Попробуйте ещё раз.',
      );
    }
    return result.invitation;
  }

  private validateToken(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new GoneException(INVALID_INVITATION);
    return hashToken(token);
  }

  async getInvitation(token: string) {
    const invitation = await this.prisma.providerTeamInvitation.findUnique({
      where: { tokenHash: this.validateToken(token) },
      select: {
        jobTitle: true,
        role: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        provider: { select: { name: true } },
      },
    });
    if (
      !invitation ||
      invitation.revokedAt ||
      (!invitation.acceptedAt && invitation.expiresAt.getTime() <= Date.now())
    ) {
      throw new GoneException(INVALID_INVITATION);
    }
    const [local, domain] = invitation.email.split('@');
    return {
      providerName: invitation.provider.name,
      jobTitle: invitation.jobTitle,
      role: invitation.role,
      emailHint: `${local.slice(0, 1)}***@${domain}`,
      expiresAt: invitation.expiresAt,
      accepted: Boolean(invitation.acceptedAt),
    };
  }

  async accept(
    userId: string,
    token: string,
    input: AcceptProviderInvitationDto,
  ) {
    const tokenHash = this.validateToken(token);
    await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.providerTeamInvitation.findUnique({
        where: { tokenHash },
      });
      if (!invitation || invitation.revokedAt)
        throw new GoneException(INVALID_INVITATION);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          accountKind: true,
          firstName: true,
          lastName: true,
        },
      });
      if (!user || user.email.toLowerCase() !== invitation.email) {
        throw new ForbiddenException(
          'Войдите с email, на который пришло приглашение',
        );
      }
      assertCanJoinProviderTeam(user);
      const existing = await tx.providerMember.findUnique({
        where: {
          providerId_userId: { providerId: invitation.providerId, userId },
        },
      });
      if (invitation.acceptedAt) {
        if (
          invitation.acceptedById !== userId ||
          existing?.status !== 'ACTIVE'
        ) {
          throw new GoneException('Приглашение уже использовано');
        }
        return;
      }
      if (invitation.expiresAt.getTime() <= Date.now())
        throw new GoneException(INVALID_INVITATION);
      if (existing?.role === 'OWNER')
        throw new ConflictException('Вы уже владелец этого профиля');
      const firstName = user.firstName?.trim() || input.firstName?.trim();
      const lastName = user.lastName?.trim() || input.lastName?.trim();
      if (!firstName || !lastName)
        throw new BadRequestException(
          'Укажите имя и фамилию для профиля команды',
        );
      const consumed = await tx.providerTeamInvitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date(), acceptedById: userId },
      });
      if (!consumed.count) {
        const current = await tx.providerTeamInvitation.findUnique({
          where: { id: invitation.id },
        });
        if (current?.acceptedById === userId && current.acceptedAt) return;
        throw new GoneException(INVALID_INVITATION);
      }
      await tx.providerMember.upsert({
        where: {
          providerId_userId: { providerId: invitation.providerId, userId },
        },
        create: {
          providerId: invitation.providerId,
          userId,
          role: invitation.role,
          status: 'ACTIVE',
          jobTitle: invitation.jobTitle,
        },
        update: {
          role: invitation.role,
          status: 'ACTIVE',
          jobTitle: invitation.jobTitle,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          name: formatUserName(firstName, lastName),
          activeProviderId: invitation.providerId,
        },
      });
    });
    return this.auth.getUserAuthContext(userId);
  }

  async revoke(actorUserId: string, providerId: string, invitationId: string) {
    await this.requireOwner(this.prisma, actorUserId, providerId);
    const result = await this.prisma.providerTeamInvitation.updateMany({
      where: {
        id: invitationId,
        providerId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException('Действующее приглашение не найдено');
    return { ok: true };
  }

  async updateJobTitle(
    actorUserId: string,
    providerId: string,
    memberId: string,
    title: string,
  ) {
    await this.requireOwner(this.prisma, actorUserId, providerId);
    const result = await this.prisma.providerMember.updateMany({
      where: { id: memberId, providerId },
      data: { jobTitle: requireJobTitle(title) },
    });
    if (!result.count) throw new NotFoundException('Сотрудник не найден');
    return { ok: true };
  }
}

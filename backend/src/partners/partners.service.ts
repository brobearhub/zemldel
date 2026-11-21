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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { MAIL_SENDER, type MailSender } from '../auth/mail/mail-sender';
import { ChatGateway } from '../chat/chat.gateway';
import { partnerPairKey, requirePartnerManager } from './partner-access';
import type { PartnerDirectoryQuery } from './partner.dto';

const providerSelect = {
  id: true,
  name: true,
  slug: true,
  image: true,
  subtitle: true,
  city: { select: { id: true, name: true, regionName: true } },
} satisfies Prisma.ProviderSelect;
const partnerInclude = {
  requester: { select: providerSelect },
  partner: { select: providerSelect },
} satisfies Prisma.ProviderPartnershipInclude;
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const TTL = 7 * 24 * 60 * 60 * 1000;
const DIRECTORY_PAGE_SIZE = 10;

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
    private readonly gateway: ChatGateway,
  ) {}

  async activeProvider(userId: string) {
    const ctx = await this.auth.getServiceManagementContext(userId, 'read');
    if (ctx.isPlatformAdmin || !ctx.providerId)
      throw new ForbiddenException('Выберите профиль исполнителя');
    await requirePartnerManager(this.prisma, userId, ctx.providerId);
    return ctx.providerId;
  }

  async directory(userId: string, query: PartnerDirectoryQuery) {
    const providerId = await this.activeProvider(userId);
    const search = query.search?.trim();
    const providerSearch = query.providerSearch?.trim();
    if (search && search.length < 3)
      throw new BadRequestException(
        'Введите минимум 3 символа названия услуги',
      );
    if (providerSearch && providerSearch.length < 3)
      throw new BadRequestException(
        'Введите минимум 3 символа фамилии или наименования организации',
      );
    if (query.subcategoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: query.subcategoryId },
      });
      if (
        !category ||
        !category.parentId ||
        (query.categoryId && category.parentId !== query.categoryId)
      )
        throw new BadRequestException(
          'Подкатегория не относится к выбранной категории',
        );
    }
    const city = query.cityId
      ? await this.prisma.city.findUnique({
          where: { id: query.cityId },
          select: { regionCode: true },
        })
      : null;
    if (query.cityId && !city) throw new BadRequestException('Город не найден');
    const serviceWhere: Prisma.ServiceWhereInput = {
      status: 'PUBLISHED',
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      ...(query.subcategoryId
        ? { categoryId: query.subcategoryId }
        : query.categoryId
          ? {
              category: {
                OR: [{ id: query.categoryId }, { parentId: query.categoryId }],
              },
            }
          : {}),
      ...(query.cityId
        ? {
            OR: [
              { allRussia: true },
              { cities: { some: { cityId: query.cityId } } },
              ...(city?.regionCode
                ? [{ regions: { some: { regionCode: city.regionCode } } }]
                : []),
              { provider: { cityId: query.cityId } },
            ],
          }
        : {}),
    };
    const filtered = Boolean(
      search || query.categoryId || query.subcategoryId || query.cityId,
    );
    const where: Prisma.ProviderWhereInput = {
      id: { not: providerId },
      ...(providerSearch
        ? { name: { contains: providerSearch, mode: 'insensitive' } }
        : {}),
      members: {
        some: {
          role: 'OWNER',
          status: 'ACTIVE',
          user: {
            accountKind: 'PROVIDER',
            systemRole: { not: 'PLATFORM_ADMIN' },
          },
        },
      },
      ...(filtered
        ? {
            OR: [
              { services: { some: serviceWhere } },
              ...(!search &&
              !query.categoryId &&
              !query.subcategoryId &&
              query.cityId
                ? [{ cityId: query.cityId }]
                : []),
            ],
          }
        : {}),
    };
    const page = query.page ?? 1;
    const rows = await this.prisma.provider.findMany({
      where,
      select: {
        ...providerSelect,
        services: {
          where: serviceWhere,
          select: {
            id: true,
            title: true,
            category: { select: { name: true } },
          },
          orderBy: { title: 'asc' },
          take: 3,
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE + 1,
    });
    return {
      items: rows.slice(0, DIRECTORY_PAGE_SIZE),
      page,
      hasMore: rows.length > DIRECTORY_PAGE_SIZE,
    };
  }

  async mine(userId: string) {
    const providerId = await this.activeProvider(userId);
    const rows = await this.prisma.providerPartnership.findMany({
      where: {
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [
          { requesterProviderId: providerId },
          { partnerProviderId: providerId },
        ],
      },
      include: partnerInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        incoming: row.partnerProviderId === providerId,
        provider:
          row.requesterProviderId === providerId ? row.partner : row.requester,
        email: row.requesterProviderId === providerId ? row.email : null,
        sentAt: row.sentAt,
        expiresAt: row.expiresAt,
      })),
    };
  }

  private async inviteRegistered(
    tx: Prisma.TransactionClient,
    userId: string,
    providerId: string,
    partnerId: string,
  ) {
    if (providerId === partnerId)
      throw new BadRequestException('Нельзя добавить свой профиль в партнёры');
    const target = await tx.provider.findFirst({
      where: {
        id: partnerId,
        members: {
          some: {
            role: 'OWNER',
            status: 'ACTIVE',
            user: {
              accountKind: 'PROVIDER',
              systemRole: { not: 'PLATFORM_ADMIN' },
            },
          },
        },
      },
      select: { id: true, ownerUser: { select: { email: true } } },
    });
    if (!target) throw new NotFoundException('Исполнитель не найден');
    const pairKey = partnerPairKey(providerId, partnerId);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pairKey}, 0))::text`;
    const previous = await tx.providerPartnership.findUnique({
      where: { pairKey },
    });
    const pendingEmail = target.ownerUser
      ? await tx.providerPartnership.findUnique({
          where: {
            requesterProviderId_email: {
              requesterProviderId: providerId,
              email: target.ownerUser.email.toLowerCase(),
            },
          },
        })
      : null;
    if (previous && ['PENDING', 'ACTIVE'].includes(previous.status)) {
      if (
        pendingEmail &&
        pendingEmail.id !== previous.id &&
        pendingEmail.status === 'PENDING'
      ) {
        await tx.providerPartnership.update({
          where: { id: pendingEmail.id },
          data: { status: 'CANCELLED', tokenHash: null },
        });
      }
      return previous;
    }
    if (!previous && pendingEmail?.status === 'PENDING') {
      return tx.providerPartnership.update({
        where: { id: pendingEmail.id },
        data: { partnerProviderId: partnerId, pairKey },
      });
    }
    if (previous && Date.now() - previous.updatedAt.getTime() < 60_000)
      throw new ConflictException('Повторить приглашение можно через минуту');
    const data = {
      requesterProviderId: providerId,
      partnerProviderId: partnerId,
      pairKey,
      invitedById: userId,
      status: 'PENDING' as const,
      email: null,
      tokenHash: null,
      expiresAt: null,
      sentAt: null,
      acceptedAt: null,
    };
    return previous
      ? tx.providerPartnership.update({ where: { id: previous.id }, data })
      : tx.providerPartnership.create({ data });
  }

  async invite(userId: string, partnerId: string) {
    const providerId = await this.activeProvider(userId);
    const row = await this.prisma.$transaction(async (tx) => {
      await requirePartnerManager(tx, userId, providerId);
      return this.inviteRegistered(tx, userId, providerId, partnerId);
    });
    return { id: row.id, status: row.status };
  }

  async inviteEmail(userId: string, rawEmail: string) {
    const providerId = await this.activeProvider(userId);
    const email = rawEmail.trim().toLowerCase();
    const publicRecipients = await this.prisma.provider.findMany({
      where: {
        useOwnEmail: true,
        email: { equals: email, mode: 'insensitive' },
        members: { some: { role: 'OWNER', status: 'ACTIVE' } },
      },
      select: { id: true },
      take: 2,
    });
    if (publicRecipients.length > 1)
      throw new BadRequestException(
        'Эта почта указана у нескольких исполнителей. Выберите партнёра в каталоге.',
      );
    if (publicRecipients[0])
      return {
        ...(await this.invite(userId, publicRecipients[0].id)),
        delivery: 'IN_APP',
      };
    const recipient = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        accountKind: true,
        activeProviderId: true,
        systemRole: true,
        ownedProviders: { select: { id: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (
      recipient &&
      (recipient.accountKind !== 'PROVIDER' ||
        recipient.systemRole === 'PLATFORM_ADMIN')
    )
      throw new BadRequestException(
        recipient.systemRole === 'PLATFORM_ADMIN'
          ? 'Укажите email аккаунта исполнителя'
          : 'Этот email зарегистрирован как клиент. Укажите почту исполнителя.',
      );
    const recipientId =
      recipient?.ownedProviders.find((p) => p.id === recipient.activeProviderId)
        ?.id ?? recipient?.ownedProviders[0]?.id;
    if (recipientId)
      return {
        ...(await this.invite(userId, recipientId)),
        delivery: 'IN_APP',
      };
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const row = await this.prisma.$transaction(async (tx) => {
      await requirePartnerManager(tx, userId, providerId);
      await tx.$queryRaw`SELECT id FROM "Provider" WHERE id = ${providerId}::uuid FOR UPDATE`;
      const old = await tx.providerPartnership.findUnique({
        where: {
          requesterProviderId_email: { requesterProviderId: providerId, email },
        },
      });
      if (old?.status === 'ACTIVE') return old;
      if (old && Date.now() - old.updatedAt.getTime() < 60_000)
        throw new ConflictException(
          'Приглашение уже отправлено. Повторить отправку можно через минуту.',
        );
      const data = {
        tokenHash,
        sentAt: null,
        expiresAt: new Date(Date.now() + TTL),
        status: 'PENDING' as const,
        invitedById: userId,
      };
      return tx.providerPartnership.upsert({
        where: {
          requesterProviderId_email: { requesterProviderId: providerId, email },
        },
        create: { requesterProviderId: providerId, email, ...data },
        update: data,
      });
    });
    if (row.status === 'ACTIVE')
      return { id: row.id, status: row.status, delivery: 'IN_APP' };
    const provider = await this.prisma.provider.findUniqueOrThrow({
      where: { id: providerId },
      select: { name: true },
    });
    const origin = (
      process.env.FRONTEND_URL ?? 'http://localhost:4000'
    ).replace(/\/$/, '');
    try {
      await this.mail.send({
        to: email,
        subject: `Приглашение в партнёры от «${provider.name}» — Земледел`,
        text: [
          `Исполнитель «${provider.name}» приглашает вас стать партнёрами на Земледеле.`,
          'После подтверждения вы сможете общаться в чате и передавать друг другу заявки без подписанного договора и оплат.',
          `Посмотреть приглашение: ${origin}/partner-invitations/${token}`,
          `Зарегистрируйтесь как исполнитель с email ${email}, создайте профиль и подтвердите приглашение.`,
          'Ссылка действует 7 дней. Если письмо пришло по ошибке, проигнорируйте его.',
        ].join('\n\n'),
      });
      await this.prisma.providerPartnership.updateMany({
        where: { id: row.id, tokenHash },
        data: { sentAt: new Date() },
      });
    } catch {
      await this.prisma.providerPartnership.updateMany({
        where: { id: row.id, tokenHash, status: 'PENDING' },
        data: { status: 'CANCELLED', tokenHash: null },
      });
      throw new BadGatewayException(
        'Не удалось отправить письмо. Попробуйте ещё раз.',
      );
    }
    return { id: row.id, status: row.status, delivery: 'EMAIL' };
  }

  async respond(
    userId: string,
    id: string,
    action: 'accept' | 'decline' | 'cancel',
  ) {
    const providerId = await this.activeProvider(userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProviderPartnership" WHERE id = ${id}::uuid FOR UPDATE`;
      await requirePartnerManager(tx, userId, providerId);
      const row = await tx.providerPartnership.findUnique({ where: { id } });
      if (
        !row ||
        (action === 'cancel'
          ? row.requesterProviderId !== providerId
          : row.partnerProviderId !== providerId)
      )
        throw new ForbiddenException('Нет доступа к приглашению');
      if (row.status === 'ACTIVE' && action === 'accept')
        return { id: row.id, status: row.status };
      if (row.status !== 'PENDING')
        throw new ConflictException('Приглашение уже обработано');
      const status =
        action === 'accept'
          ? 'ACTIVE'
          : action === 'decline'
            ? 'DECLINED'
            : 'CANCELLED';
      await tx.providerPartnership.update({
        where: { id },
        data: { status, acceptedAt: action === 'accept' ? new Date() : null },
      });
      return { id, status };
    });
  }

  private tokenHash(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new GoneException('Приглашение недействительно');
    return hashToken(token);
  }

  async invitation(token: string) {
    const row = await this.prisma.providerPartnership.findUnique({
      where: { tokenHash: this.tokenHash(token) },
      include: { requester: { select: { name: true } } },
    });
    if (
      !row ||
      ['DECLINED', 'CANCELLED'].includes(row.status) ||
      (row.status !== 'ACTIVE' &&
        row.expiresAt &&
        row.expiresAt.getTime() < Date.now())
    )
      throw new GoneException(
        'Срок приглашения истёк или оно отменено. Попросите отправить новое.',
      );
    const [local, domain] = (row.email ?? '').split('@');
    return {
      providerName: row.requester.name,
      emailHint: `${local.slice(0, 1)}***@${domain}`,
      accepted: row.status === 'ACTIVE',
    };
  }

  async acceptInvitation(userId: string, token: string) {
    const providerId = await this.activeProvider(userId);
    const tokenHash = this.tokenHash(token);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProviderPartnership" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      const row = await tx.providerPartnership.findUnique({
        where: { tokenHash },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      if (!row || ['DECLINED', 'CANCELLED'].includes(row.status))
        throw new GoneException('Приглашение недействительно');
      if (user.email.toLowerCase() !== row.email)
        throw new ForbiddenException(
          'Войдите с email, на который отправлено приглашение',
        );
      await requirePartnerManager(tx, userId, providerId);
      if (row.requesterProviderId === providerId)
        throw new BadRequestException(
          'Нельзя принять приглашение в свой профиль',
        );
      if (row.status === 'ACTIVE') {
        if (row.partnerProviderId !== providerId)
          throw new ForbiddenException(
            'Приглашение уже принято другим профилем',
          );
        return { id: row.id };
      }
      if (row.expiresAt && row.expiresAt.getTime() < Date.now())
        throw new GoneException('Срок приглашения истёк');
      const pairKey = partnerPairKey(row.requesterProviderId, providerId);
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pairKey}, 0))::text`;
      const existing = await tx.providerPartnership.findUnique({
        where: { pairKey },
      });
      if (existing && existing.id !== row.id) {
        await tx.providerPartnership.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', acceptedAt: new Date() },
        });
        await tx.providerPartnership.update({
          where: { id: row.id },
          data: { status: 'CANCELLED', tokenHash: null },
        });
        return { id: existing.id };
      }
      await tx.providerPartnership.update({
        where: { id: row.id },
        data: {
          partnerProviderId: providerId,
          pairKey,
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      });
      return { id: row.id };
    });
  }

  async conversation(userId: string, id: string) {
    const providerId = await this.activeProvider(userId);
    const conversation = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ProviderPartnership" WHERE id = ${id}::uuid FOR UPDATE`;
      await requirePartnerManager(tx, userId, providerId);
      const row = await tx.providerPartnership.findUnique({
        where: { id },
        include: {
          partner: {
            select: {
              members: {
                where: { role: 'OWNER', status: 'ACTIVE' },
                select: { userId: true },
                take: 1,
              },
            },
          },
        },
      });
      if (
        !row ||
        row.status !== 'ACTIVE' ||
        !row.partnerProviderId ||
        ![row.partnerProviderId, row.requesterProviderId].includes(providerId)
      )
        throw new ForbiddenException(
          'Чат доступен только подтверждённым партнёрам',
        );
      const ownerId = row.partner?.members[0]?.userId;
      if (!ownerId)
        throw new BadRequestException('Профиль партнёра недоступен');
      return tx.conversation.upsert({
        where: { partnershipId: id },
        update: {},
        create: {
          kind: 'PARTNER',
          partnershipId: id,
          providerId: row.requesterProviderId,
          partnerProviderId: row.partnerProviderId,
          customerUserId: ownerId,
        },
      });
    });
    // Empty partner chats are visible in both inboxes immediately.
    const members = await this.prisma.providerMember.findMany({
      where: {
        providerId: {
          in: [conversation.providerId, conversation.partnerProviderId].filter(
            (id): id is string => Boolean(id),
          ),
        },
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { userId: true },
    });
    for (const member of members)
      this.gateway.emitConversationChanged(member.userId, conversation.id);
    return { conversationId: conversation.id };
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_SENDER, type MailSender } from '../auth/mail/mail-sender';
import { readPasswordResetConfig } from '../auth/mail/create-mail-sender';
import { isOlderThanOneBusinessDay } from './verification-business-day';

const QUEUE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
type QueueStatus = (typeof QUEUE_STATUSES)[number];

const FNS_LABEL: Record<string, string> = {
  FOUND_ACTIVE: 'Найден, действующий',
  FOUND_TERMINATED: 'Найден, деятельность прекращена',
  NOT_FOUND: 'Не найден',
  MISMATCH: 'Расхождение с поданными данными',
  UNAVAILABLE: 'Сверка недоступна',
  NOT_SUPPORTED: 'Сверка недоступна',
};

type Snapshot = {
  lastName: string | null;
  firstName: string | null;
  middleName: string | null;
  legalName: string | null;
  inn: string | null;
  ogrn: string | null;
};

@Injectable()
export class ProviderVerificationAdminService {
  private readonly logger = new Logger(ProviderVerificationAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
  ) {}

  async list(actorUserId: string, query: { status?: string; q?: string }) {
    await this.assertAdmin(actorUserId);
    const status = this.parseStatus(query.status);
    const q = query.q?.trim() ?? '';
    const where: Prisma.ProviderVerificationRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { inn: { contains: q } },
              { ogrn: { contains: q } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const now = new Date();
    const [rows, pendingCount] = await Promise.all([
      this.prisma.providerVerificationRequest.findMany({
        where,
        orderBy: { submittedAt: 'asc' },
        select: {
          id: true,
          submittedAt: true,
          type: true,
          displayName: true,
          inn: true,
          ogrn: true,
          fnsStatus: true,
          status: true,
        },
      }),
      this.prisma.providerVerificationRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);
    const rank: Record<QueueStatus, number> = {
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 2,
    };
    const items = rows
      .map((row) => ({
        id: row.id,
        submittedAt: row.submittedAt.toISOString(),
        type: row.type,
        displayName: row.displayName,
        inn: row.inn,
        ogrn: row.ogrn,
        fnsStatus: row.fnsStatus,
        fnsLabel: fnsLabel(row.fnsStatus),
        status: row.status,
        overdue:
          row.status === 'PENDING' &&
          isOlderThanOneBusinessDay(row.submittedAt, now),
      }))
      .sort((left, right) => {
        const byStatus = rank[left.status] - rank[right.status];
        if (byStatus !== 0) return byStatus;
        return left.submittedAt.localeCompare(right.submittedAt);
      });
    return { items, pendingCount };
  }

  async pendingCount(actorUserId: string) {
    await this.assertAdmin(actorUserId);
    const pendingCount = await this.prisma.providerVerificationRequest.count({
      where: { status: 'PENDING' },
    });
    return { pendingCount };
  }

  async getOne(actorUserId: string, requestId: string) {
    await this.assertAdmin(actorUserId);
    const row = await this.loadRequest(requestId);
    const history = await this.prisma.providerVerificationRequest.findMany({
      where: { providerId: row.providerId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        submittedAt: true,
        status: true,
        decidedAt: true,
        rejectReason: true,
        decidedBy: { select: { name: true, email: true } },
        fnsManualCheckedAt: true,
        fnsManualCheckedBy: { select: { name: true, email: true } },
      },
    });
    const snapshot = readSnapshot(row.submittedSnapshot);
    return {
      id: row.id,
      status: row.status,
      submittedAt: row.submittedAt.toISOString(),
      decidedAt: row.decidedAt?.toISOString() ?? null,
      rejectReason: row.rejectReason,
      type: row.type,
      displayName: row.displayName,
      requisites: {
        fullName: personName(snapshot),
        legalName: snapshot.legalName,
        inn: snapshot.inn ?? row.inn,
        ogrn: snapshot.ogrn ?? row.ogrn,
      },
      provider: {
        id: row.provider.id,
        name: row.provider.name,
        cityName: row.provider.city?.name ?? null,
        verificationStatus: row.provider.verificationStatus,
      },
      fns: {
        status: row.fnsStatus,
        label: fnsLabel(row.fnsStatus),
        checkedAt: row.fnsCheckedAt?.toISOString() ?? null,
        source: row.fnsSource,
        available: fnsAvailable(row.fnsStatus),
        manualCheckedAt: row.fnsManualCheckedAt?.toISOString() ?? null,
        manualCheckedByName:
          row.fnsManualCheckedBy?.name ?? row.fnsManualCheckedBy?.email ?? null,
      },
      history: history.map((item) => ({
        id: item.id,
        submittedAt: item.submittedAt.toISOString(),
        status: item.status,
        decidedAt: item.decidedAt?.toISOString() ?? null,
        rejectReason: item.rejectReason,
        decidedByName: item.decidedBy?.name ?? item.decidedBy?.email ?? null,
        fnsManualCheckedAt: item.fnsManualCheckedAt?.toISOString() ?? null,
        fnsManualCheckedByName:
          item.fnsManualCheckedBy?.name ??
          item.fnsManualCheckedBy?.email ??
          null,
      })),
    };
  }

  async approve(actorUserId: string, requestId: string) {
    await this.assertAdmin(actorUserId);
    const decision = await this.decide(actorUserId, requestId, null);
    await this.notifyOwner(decision, null);
    return { status: 'APPROVED' as const };
  }

  async reject(actorUserId: string, requestId: string, reasonInput: string) {
    await this.assertAdmin(actorUserId);
    const reason = reasonInput.trim();
    if (!reason) {
      throw new BadRequestException('Укажите причину отклонения');
    }
    const decision = await this.decide(actorUserId, requestId, reason);
    await this.notifyOwner(decision, reason);
    return { status: 'REJECTED' as const };
  }

  /** Отметка в журнале. Значок профиля не меняет и сервис ФНС не вызывает. */
  async markFnsManual(actorUserId: string, requestId: string) {
    await this.assertAdmin(actorUserId);
    await this.loadRequest(requestId);
    const checkedAt = new Date();
    await this.prisma.providerVerificationRequest.update({
      where: { id: requestId },
      data: {
        fnsManualCheckedAt: checkedAt,
        fnsManualCheckedByUserId: actorUserId,
      },
    });
    return { fnsManualCheckedAt: checkedAt.toISOString() };
  }

  private async decide(
    actorUserId: string,
    requestId: string,
    reason: string | null,
  ) {
    const row = await this.loadRequest(requestId);
    if (row.status !== 'PENDING') {
      throw new ConflictException('Решение по заявке уже записано');
    }
    const inn = row.inn?.trim() || null;
    if (!reason && inn) {
      const taken = await this.prisma.provider.findFirst({
        where: { verifiedInn: inn, NOT: { id: row.providerId } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException(
          'Этот ИНН уже подтверждён в другом профиле',
        );
      }
    }
    const decidedAt = new Date();
    const approved = reason === null;
    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.providerVerificationRequest.updateMany({
          where: { id: requestId, status: 'PENDING' },
          data: {
            status: approved ? 'APPROVED' : 'REJECTED',
            decidedAt,
            decidedByUserId: actorUserId,
            rejectReason: reason,
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Решение по заявке уже записано');
        }
        await tx.provider.update({
          where: { id: row.providerId },
          data: approved
            ? {
                verificationStatus: 'VERIFIED',
                verifiedAt: decidedAt,
                verifiedInn: inn,
                verificationRejectReason: null,
              }
            : {
                verificationStatus: 'REJECTED',
                verifiedAt: null,
                verifiedInn: null,
                verificationRejectReason: reason,
              },
        });
      });
    } catch (error) {
      if (isUniqueInnConflict(error)) {
        throw new ConflictException(
          'Этот ИНН уже подтверждён в другом профиле',
        );
      }
      throw error;
    }
    return {
      ownerEmail: row.provider.ownerUser?.email ?? null,
      approved,
    };
  }

  private async notifyOwner(
    decision: { ownerEmail: string | null; approved: boolean },
    reason: string | null,
  ) {
    if (!decision.ownerEmail) return;
    const origin = readPasswordResetConfig().frontendUrl;
    const subject = decision.approved
      ? 'Реквизиты профиля подтверждены'
      : 'Заявку на проверку отклонили';
    const text = decision.approved
      ? 'Администратор подтвердил реквизиты. В кабинете у профиля стоит значок «Реквизиты проверены».'
      : `Заявку отклонили: ${reason}\nИсправить и отправить снова: ${origin}/pro/profile/verification`;
    try {
      await this.mail.send({ to: decision.ownerEmail, subject, text });
    } catch (error) {
      this.logger.warn(
        `Не удалось отправить письмо о решении: ${String(error)}`,
      );
    }
  }

  private async loadRequest(requestId: string) {
    const row = await this.prisma.providerVerificationRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            ownerUser: { select: { email: true } },
            city: { select: { name: true } },
          },
        },
        fnsManualCheckedBy: { select: { name: true, email: true } },
      },
    });
    if (!row) throw new NotFoundException('Заявка не найдена');
    return row;
  }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });
    if (user?.systemRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Forbidden');
    }
  }

  private parseStatus(value: string | undefined): QueueStatus | undefined {
    if (!value) return undefined;
    if ((QUEUE_STATUSES as readonly string[]).includes(value)) {
      return value as QueueStatus;
    }
    throw new BadRequestException('Неизвестный статус');
  }
}

function fnsAvailable(status: string | null) {
  return Boolean(
    status && status !== 'UNAVAILABLE' && status !== 'NOT_SUPPORTED',
  );
}

function fnsLabel(status: string | null) {
  if (!fnsAvailable(status) || !status) return 'Сверка недоступна';
  return FNS_LABEL[status] ?? 'Сверка недоступна';
}

function readSnapshot(value: Prisma.JsonValue): Snapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      lastName: null,
      firstName: null,
      middleName: null,
      legalName: null,
      inn: null,
      ogrn: null,
    };
  }
  const row = value as Record<string, unknown>;
  const text = (key: string) =>
    typeof row[key] === 'string' && row[key] ? row[key] : null;
  return {
    lastName: text('lastName'),
    firstName: text('firstName'),
    middleName: text('middleName'),
    legalName: text('legalName'),
    inn: text('inn'),
    ogrn: text('ogrn'),
  };
}

function personName(snapshot: Snapshot) {
  const parts = [
    snapshot.lastName,
    snapshot.firstName,
    snapshot.middleName,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : null;
}

function isUniqueInnConflict(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

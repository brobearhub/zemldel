import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  entitlementPlan,
  localDay,
  nextMidnight,
  planEnforcementEnabled,
  PLAN_LIMITS,
} from './plan-policy';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async access(providerId: string, tx: Prisma.TransactionClient = this.prisma) {
    const account = await tx.billingTestAccount.findUnique({
      where: { providerId },
    });
    const plan = entitlementPlan(account);
    return { plan, limits: PLAN_LIMITS[plan], account };
  }

  async member(userId: string, providerId: string, owner = false) {
    const row = await this.prisma.providerMember.findUnique({
      where: { providerId_userId: { providerId, userId } },
    });
    if (!row || row.status !== 'ACTIVE' || (owner && row.role !== 'OWNER'))
      throw new ForbiddenException('Нет доступа к профилю');
    return row;
  }

  async requireFeature(
    providerId: string,
    feature: 'templates' | 'sharedTemplates' | 'team',
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const { limits } = await this.access(providerId, tx);
    if (!limits[feature])
      throw new ForbiddenException({
        code: 'PLAN_REQUIRED',
        message: 'Эта возможность недоступна на текущем тарифе',
        billingUrl: '/pro/billing',
      });
  }

  async consumeReply(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    conversationId: string,
  ) {
    if (!planEnforcementEnabled()) return;
    const conv = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: {
        providerId: true,
        requestId: true,
        customerUserId: true,
        request: {
          select: { serviceId: true, categoryId: true, customerUserId: true },
        },
      },
    });
    if (
      !conv?.providerId ||
      !conv.requestId ||
      !conv.request ||
      conv.request.serviceId ||
      conv.request.categoryId ||
      conv.customerUserId === actorUserId ||
      conv.request.customerUserId === actorUserId
    )
      return;
    const providerId = conv.providerId;
    const member = await tx.providerMember.findUnique({
      where: { providerId_userId: { providerId, userId: actorUserId } },
    });
    if (member?.status !== 'ACTIVE') return;
    await tx.$queryRaw`SELECT id FROM "Provider" WHERE id = ${providerId}::uuid FOR UPDATE`;
    const key = {
      providerId_requestId: { providerId, requestId: conv.requestId },
    };
    if (await tx.replyDebit.findUnique({ where: key })) return;
    // Replies sent while enforcement was paused are free when it resumes.
    const previousReply = await tx.message.findFirst({
      where: {
        conversation: { requestId: conv.requestId, providerId },
        kind: 'USER',
        senderUserId: { not: conv.customerUserId },
      },
      select: { id: true },
    });
    if (previousReply) {
      await tx.replyDebit.create({
        data: { providerId, requestId: conv.requestId, source: 'LEGACY' },
      });
      return;
    }
    const now = new Date();
    let account = await tx.billingTestAccount.upsert({
      where: { providerId },
      create: { providerId },
      update: {},
    });
    if (!account.quotaResetAt || account.quotaResetAt <= now) {
      account = await tx.billingTestAccount.update({
        where: { providerId },
        data: {
          dailyUsed: 0,
          quotaDate: localDay(now, account.timezone),
          quotaTimezone: account.timezone,
          quotaStartedAt: now,
          quotaResetAt: nextMidnight(now, account.timezone),
        },
      });
    }
    const limit = PLAN_LIMITS[entitlementPlan(account)].replies;
    let source = 'UNLIMITED';
    if (limit === null)
      await tx.billingTestAccount.update({
        where: { providerId },
        data: { dailyUsed: { increment: 1 } },
      });
    if (limit !== null) {
      if (account.dailyUsed < limit) {
        source = 'DAILY';
        await tx.billingTestAccount.update({
          where: { providerId },
          data: { dailyUsed: { increment: 1 } },
        });
      } else if (account.replyCredits > 0) {
        source = 'RESERVE';
        await tx.billingTestAccount.update({
          where: { providerId },
          data: { replyCredits: { decrement: 1 } },
        });
      } else
        throw new ForbiddenException({
          code: 'REPLY_LIMIT',
          message:
            'Дневной лимит откликов исчерпан. Купите пакет или дождитесь обновления лимита.',
          resetAt: account.quotaResetAt,
          billingUrl: '/pro/billing',
        });
    }
    await tx.replyDebit.create({
      data: { providerId, requestId: conv.requestId, source },
    });
  }

  async validateService(
    providerId: string,
    input: {
      stockBadge?: string | null;
      paletteColor?: string | null;
      allRussia?: boolean;
      regionCodes?: string[];
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const { plan, limits } = await this.access(providerId, tx);
    if (input.stockBadge && plan === 'STANDARD')
      throw new ForbiddenException('Метка доступна на тарифах Лайт и Бизнес');
    if (
      input.paletteColor &&
      (plan === 'STANDARD' ||
        (plan === 'LITE' && input.paletteColor !== 'primary'))
    )
      throw new ForbiddenException(
        'Этот цвет метки недоступен на текущем тарифе',
      );
    if (input.allRussia && plan !== 'BUSINESS')
      throw new ForbiddenException('Вся Россия доступна на тарифе Бизнес');
    if (
      input.regionCodes &&
      limits.regions !== null &&
      new Set(input.regionCodes).size > limits.regions
    )
      throw new BadRequestException(
        `Тариф позволяет выбрать не более ${limits.regions} областей для каждой услуги`,
      );
    return limits;
  }
}

import {
  effectivePlan,
  entitlementPlan,
  planEnforcementEnabled,
  nextMidnight,
  PLAN_LIMITS,
  upgradeAmount,
} from './plan-policy';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { BillingTestOrder, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  addCalendarMonth,
  BILLING_PRODUCTS,
  CLOSED_STATUSES,
  REFUND_STATUSES,
  type BillingProduct,
} from './billing-catalog';
import {
  billingConfig,
  safePaymentUrl,
  TbankClient,
  verifyBankToken,
} from './tbank';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bank: TbankClient,
  ) {}

  private async authorize(userId: string, providerId: string, owner = false) {
    const member = await this.prisma.providerMember.findUnique({
      where: { providerId_userId: { providerId, userId } },
    });
    if (
      !member ||
      member.status !== 'ACTIVE' ||
      (owner && member.role !== 'OWNER')
    ) {
      throw new ForbiddenException(
        owner ? 'Оплата доступна владельцу профиля' : 'Нет доступа к профилю',
      );
    }
    return member;
  }

  async lock(tx: Prisma.TransactionClient, providerId: string) {
    // One profile lock serializes purchases and fulfillment across all app instances.
    await tx.$queryRaw`SELECT "id" FROM "Provider" WHERE "id" = ${providerId}::uuid FOR UPDATE`;
  }

  view(order: BillingTestOrder) {
    return {
      id: order.id,
      product: order.product,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      fulfilledAt: order.fulfilledAt,
      paymentUrl:
        !order.renewalCycle &&
        !CLOSED_STATUSES.includes(order.status) &&
        order.expiresAt > new Date()
          ? order.paymentUrl
          : null,
    };
  }

  async overview(userId: string, providerId: string) {
    const member = await this.authorize(userId, providerId);
    const [account, orders] = await Promise.all([
      this.prisma.billingTestAccount.findUnique({ where: { providerId } }),
      this.prisma.billingTestOrder.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);
    let enabled = false;
    try {
      billingConfig();
      enabled = true;
    } catch {
      /* visible setup state */
    }
    return {
      mode: 'test',
      enabled,
      canPay: member.role === 'OWNER',
      plan: effectivePlan(account),
      entitlementPlan: entitlementPlan(account),
      enforcementEnabled: planEnforcementEnabled(),
      limits: PLAN_LIMITS[entitlementPlan(account)],
      autoRenew: account?.autoRenew ?? false,
      canAutoRenew: Boolean(account?.rebillId),
      nextPlan: account?.nextPlan ?? null,
      timezone: account?.timezone ?? 'Europe/Moscow',
      graceUntil: account?.graceUntil ?? null,
      dailyUsed:
        account?.quotaResetAt && account.quotaResetAt > new Date()
          ? account.dailyUsed
          : 0,
      quotaResetAt:
        account?.quotaResetAt ??
        nextMidnight(new Date(), account?.timezone ?? 'Europe/Moscow'),
      notices: await this.prisma.billingNotice.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      planExpiresAt: account?.planExpiresAt ?? null,
      replyCredits: account?.replyCredits ?? 0,
      needsReview: account?.needsReview ?? false,
      orders: orders.map((order) => this.view(order)),
    };
  }

  async checkout(
    userId: string,
    providerId: string,
    product: BillingProduct,
    operationId: string,
    autoRenew = false,
    quoteAt?: string,
    expectedAmount?: number,
  ) {
    await this.authorize(userId, providerId, true);
    const config = billingConfig();
    const selected = BILLING_PRODUCTS[product];
    if (!selected) throw new BadRequestException('Неизвестный продукт');
    const { order, created } = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerId);
      const previous = await tx.billingTestOrder.findUnique({
        where: { providerId_operationId: { providerId, operationId } },
      });
      if (previous) {
        if (
          previous.product !== product ||
          previous.autoRenew !== (autoRenew && product !== 'REPLIES_10')
        )
          throw new ConflictException(
            'Эта операция уже использована для другого продукта',
          );
        return { order: previous, created: false };
      }
      const pending = await tx.billingTestOrder.findFirst({
        where: {
          providerId,
          status: { notIn: CLOSED_STATUSES },
          expiresAt: { gt: new Date() },
        },
      });
      if (pending)
        throw new ConflictException(
          'Есть незавершённая оплата. Продолжите её или проверьте статус в истории.',
        );
      const account = await tx.billingTestAccount.findUnique({
        where: { providerId },
      });
      if (account?.needsReview)
        throw new ConflictException(
          'Возврат платежа требует проверки. Новые тестовые покупки временно недоступны.',
        );
      if (product === 'REPLIES_10' && effectivePlan(account) === 'BUSINESS') {
        throw new ConflictException(
          'На тарифе Бизнес дополнительные отклики не нужны',
        );
      }
      if (
        product === 'LITE' &&
        effectivePlan(account) === 'BUSINESS' &&
        account?.planExpiresAt &&
        account.planExpiresAt > new Date()
      )
        throw new ConflictException(
          'Запланируйте переход на Лайт после окончания Бизнеса',
        );
      if (
        product === account?.plan &&
        account.planExpiresAt &&
        account.planExpiresAt > new Date()
      )
        throw new ConflictException(
          'Тариф уже оплачен. Следующий месяц можно оплатить по окончании текущего срока или включить автопродление.',
        );
      const quoted = quoteAt ? new Date(quoteAt) : new Date();
      if (
        !Number.isFinite(quoted.getTime()) ||
        quoted.getTime() > Date.now() + 1000 ||
        Date.now() - quoted.getTime() > 300000
      )
        throw new ConflictException('Расчёт устарел. Обновите стоимость');
      const amount = upgradeAmount(account, product, quoted);
      if (expectedAmount !== undefined && amount !== expectedAmount)
        throw new ConflictException(
          'Тариф изменился. Обновите расчёт стоимости',
        );
      const consent =
        product === 'REPLIES_10'
          ? null
          : await tx.billingTestAccount.upsert({
              where: { providerId },
              create: { providerId, consentVersion: 1 },
              update: { consentVersion: { increment: 1 } },
            });
      return {
        created: true,
        order: await tx.billingTestOrder.create({
          data: {
            id: randomUUID(),
            providerId,
            product,
            operationId,
            amount,
            autoRenew: autoRenew && product !== 'REPLIES_10',
            consentVersion:
              consent?.consentVersion ?? account?.consentVersion ?? 0,
            basePlan: account?.plan ?? 'STANDARD',
            baseExpiresAt: account?.planExpiresAt,
            terminalKey: config.terminalKey,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        }),
      };
    });
    if (!created) return this.view(order);

    return this.initialize(order);
  }

  async initialize(order: BillingTestOrder) {
    const config = billingConfig();
    const selected = BILLING_PRODUCTS[order.product as BillingProduct];
    const providerId = order.providerId;
    const returnUrl = `${config.siteUrl}/pro/billing?order=${order.id}`;
    // Persist first, then exactly one Init. A lost response is recovered by CheckOrder.
    const result = await this.bank.call('Init', {
      Amount: order.amount,
      OrderId: order.id,
      Description: selected.title,
      ...(order.autoRenew && !order.renewalCycle
        ? { Recurrent: 'Y', CustomerKey: providerId }
        : {}),
      CustomerKey: providerId,
      DATA: {
        OperationInitiatorType: order.renewalCycle
          ? 'R'
          : order.autoRenew
            ? '1'
            : '0',
      },
      PayType: 'O',
      Language: 'ru',
      RedirectDueDate: order.expiresAt.toISOString(),
      NotificationURL: config.notificationUrl,
      SuccessURL: returnUrl,
      FailURL: returnUrl,
    });
    if (result.Success === false) {
      await this.prisma.billingTestOrder.updateMany({
        where: { id: order.id, status: 'INITIALIZING' },
        data: { status: 'INIT_FAILED' },
      });
      throw new ServiceUnavailableException(
        'Банк не создал платёж. Проверьте настройки тестового терминала.',
      );
    }
    if (result.Success !== true)
      throw new ServiceUnavailableException('Некорректный ответ банка');
    this.validatePayment(order, result);
    const paymentUrl = safePaymentUrl(result.PaymentURL);
    const saved = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerId);
      const current = await tx.billingTestOrder.findUniqueOrThrow({
        where: { id: order.id },
      });
      this.validatePayment(current, result);
      return tx.billingTestOrder.update({
        where: { id: order.id },
        data: {
          paymentId: String(result.PaymentId),
          paymentUrl,
          ...(current.status === 'INITIALIZING' ? { status: 'NEW' } : {}),
        },
      });
    });
    return this.view(saved);
  }

  private validatePayment(
    order: BillingTestOrder,
    payload: Record<string, unknown>,
    refund = false,
  ) {
    const paymentId =
      typeof payload.PaymentId === 'string' ||
      typeof payload.PaymentId === 'number'
        ? String(payload.PaymentId)
        : '';
    if (
      payload.TerminalKey !== order.terminalKey ||
      payload.OrderId !== order.id ||
      !/^\d{1,20}$/.test(paymentId) ||
      (order.paymentId && order.paymentId !== paymentId) ||
      !Number.isSafeInteger(payload.Amount) ||
      (!refund && payload.Amount !== order.amount) ||
      (refund &&
        (Number(payload.Amount) < 0 || Number(payload.Amount) > order.amount))
    ) {
      throw new BadRequestException('Данные платежа не совпадают с заказом');
    }
  }

  async notification(payload: Record<string, unknown>) {
    const config = billingConfig();
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      payload.TerminalKey !== config.terminalKey ||
      !verifyBankToken(payload, config.password)
    ) {
      throw new ForbiddenException('Неверная подпись уведомления');
    }
    await this.applyState(payload);
    return 'OK';
  }

  async refresh(userId: string, providerId: string, orderId: string) {
    await this.authorize(userId, providerId);
    let order = await this.prisma.billingTestOrder.findFirst({
      where: { id: orderId, providerId },
    });
    if (!order) throw new NotFoundException('Платёж не найден');
    const config = billingConfig();
    if (order.terminalKey !== config.terminalKey)
      throw new ConflictException('Платёж создан другим терминалом');
    if (!order.paymentId) {
      const check = await this.bank.call('CheckOrder', { OrderId: order.id });
      if (
        check.Success !== true ||
        check.TerminalKey !== config.terminalKey ||
        check.OrderId !== order.id ||
        !Array.isArray(check.Payments) ||
        check.Payments.length !== 1
      ) {
        throw new ServiceUnavailableException(
          'Банк пока не подтвердил создание платежа. Повторите проверку позже; новый платёж доступен через 30 минут.',
        );
      }
      const payment = check.Payments[0] as Record<string, unknown>;
      const paymentId =
        typeof payment.PaymentId === 'string' ||
        typeof payment.PaymentId === 'number'
          ? String(payment.PaymentId)
          : '';
      if (!/^\d{1,20}$/.test(paymentId))
        throw new ServiceUnavailableException('Некорректный ответ банка');
      // GetState independently verifies order, amount and terminal before persisting.
      const state = await this.bank.call('GetState', { PaymentId: paymentId });
      if (state.OrderId !== order.id)
        throw new BadRequestException('Заказ банка не совпадает');
      await this.applyState(state, true);
    } else {
      const state = await this.bank.call('GetState', {
        PaymentId: order.paymentId,
      });
      if (state.OrderId !== order.id)
        throw new BadRequestException('Заказ банка не совпадает');
      await this.applyState(state, true);
    }
    order = await this.prisma.billingTestOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    return this.view(order);
  }

  async applyState(payload: Record<string, unknown>, fromApi = false) {
    if (
      typeof payload.OrderId !== 'string' ||
      !/^[\da-f-]{36}$/i.test(payload.OrderId)
    )
      throw new BadRequestException('Некорректный заказ');
    if (
      fromApi &&
      (payload.Success !== true || String(payload.ErrorCode) !== '0')
    )
      throw new ServiceUnavailableException('Банк не вернул статус платежа');
    const snapshot = await this.prisma.billingTestOrder.findUnique({
      where: { id: payload.OrderId },
    });
    if (!snapshot) throw new NotFoundException('Платёж не найден');
    const status = typeof payload.Status === 'string' ? payload.Status : '';
    if (!/^[A-Z_]{2,40}$/.test(status))
      throw new BadRequestException('Некорректный статус');
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, snapshot.providerId);
      const order = await tx.billingTestOrder.findUniqueOrThrow({
        where: { id: snapshot.id },
      });
      const refund = REFUND_STATUSES.includes(status);
      this.validatePayment(order, payload, refund);
      const rebillId =
        typeof payload.RebillId === 'string' ||
        typeof payload.RebillId === 'number'
          ? String(payload.RebillId)
          : null;
      if (
        order.autoRenew &&
        !order.renewalCycle &&
        rebillId &&
        /^\d{1,40}$/.test(rebillId) &&
        payload.Success === true &&
        ['AUTHORIZED', 'CONFIRMED'].includes(status)
      ) {
        await tx.billingTestOrder.update({
          where: { id: order.id },
          data: { rebillId },
        });
        if (order.fulfilledAt && !REFUND_STATUSES.includes(order.status))
          await tx.billingTestAccount.updateMany({
            where: {
              providerId: order.providerId,
              consentVersion: order.consentVersion,
              needsReview: false,
            },
            data: { rebillId, autoRenew: true },
          });
      }
      if (rebillId && ['AUTHORIZED', 'CONFIRMED'].includes(status))
        await tx.billingNotice.deleteMany({
          where: { key: `mandate:${order.id}` },
        });
      // Delayed AUTHORIZED/CONFIRMED must never undo a refund or credit twice.
      if (REFUND_STATUSES.includes(order.status) && !refund) return;
      if (order.status === 'REFUNDED' && status === 'PARTIAL_REFUNDED') return;
      if (order.fulfilledAt && !refund) return;
      if (CLOSED_STATUSES.includes(order.status) && !refund) return;
      if (
        status === 'CONFIRMED' &&
        (payload.Success !== true || String(payload.ErrorCode) !== '0')
      ) {
        throw new BadRequestException('Платёж не подтверждён');
      }
      if (refund && (status !== 'REVERSED' || order.fulfilledAt)) {
        await tx.billingTestAccount.upsert({
          where: { providerId: order.providerId },
          create: { providerId: order.providerId, needsReview: true },
          update: { needsReview: true, autoRenew: false },
        });
      }
      if (status === 'CONFIRMED') {
        const account = await tx.billingTestAccount.upsert({
          where: { providerId: order.providerId },
          create: { providerId: order.providerId },
          update: {},
        });
        const now = new Date();
        if (order.product === 'REPLIES_10') {
          await tx.billingTestAccount.update({
            where: { providerId: order.providerId },
            data: { replyCredits: { increment: 10 } },
          });
        } else {
          const expectedExpiry = order.renewalCycle ?? order.baseExpiresAt;
          if (
            (account.planExpiresAt?.getTime() ?? null) !==
              (expectedExpiry?.getTime() ?? null) ||
            (!order.renewalCycle && account.plan !== order.basePlan)
          ) {
            await tx.billingTestAccount.update({
              where: { providerId: order.providerId },
              data: { needsReview: true, autoRenew: false },
            });
            await tx.billingTestOrder.update({
              where: { id: order.id },
              data: {
                paymentId: String(payload.PaymentId),
                status,
                fulfilledAt: now,
              },
            });
            await tx.billingNotice.upsert({
              where: { key: `conflict:${order.id}` },
              create: {
                providerId: order.providerId,
                key: `conflict:${order.id}`,
                message:
                  'Получено запоздалое подтверждение оплаты после изменения тарифа. Действующий тариф сохранён, платёж требует сверки.',
              },
              update: {},
            });
            return;
          }
          const start = order.renewalCycle ?? now;
          const savedMandate = rebillId ?? order.rebillId;
          const consentCurrent =
            account.consentVersion === order.consentVersion;
          await tx.billingTestAccount.update({
            where: { providerId: order.providerId },
            data: {
              plan: order.product,
              planStartedAt: start,
              planExpiresAt: addCalendarMonth(start),
              graceUntil: null,
              nextPlan: null,
              ...(!order.renewalCycle && consentCurrent
                ? {
                    autoRenew: order.autoRenew && Boolean(savedMandate),
                    rebillId: order.autoRenew ? savedMandate : null,
                  }
                : {}),
            },
          });
          await tx.billingNotice.deleteMany({
            where: {
              providerId: order.providerId,
              OR: [
                { key: { startsWith: 'renewal:' } },
                { key: { startsWith: 'expired:' } },
              ],
            },
          });
          if (order.autoRenew && !order.renewalCycle && !savedMandate)
            await tx.billingNotice.upsert({
              where: { key: `mandate:${order.id}` },
              create: {
                providerId: order.providerId,
                key: `mandate:${order.id}`,
                message:
                  'Тариф оплачен. Ожидаем от банка подтверждение подключения автопродления.',
              },
              update: {},
            });
        }
      }
      await tx.billingTestOrder.update({
        where: { id: order.id },
        data: {
          paymentId: String(payload.PaymentId),
          status,
          ...(status === 'CONFIRMED' ? { fulfilledAt: new Date() } : {}),
        },
      });
    });
  }
  async quote(userId: string, providerId: string, product: BillingProduct) {
    await this.authorize(userId, providerId, true);
    const account = await this.prisma.billingTestAccount.findUnique({
      where: { providerId },
    });
    const now = new Date();
    return {
      product,
      amount: upgradeAmount(account, product, now),
      quoteAt: now.toISOString(),
    };
  }

  async settings(
    userId: string,
    providerId: string,
    input: { timezone?: string; autoRenew?: boolean; nextPlan?: string | null },
  ) {
    await this.authorize(userId, providerId, true);
    if (input.timezone !== undefined) {
      try {
        nextMidnight(new Date(), input.timezone);
      } catch {
        throw new BadRequestException('Неизвестный часовой пояс');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerId);
      const account = await tx.billingTestAccount.upsert({
        where: { providerId },
        create: { providerId },
        update: {},
      });
      if (input.autoRenew && !account.rebillId)
        throw new BadRequestException(
          'Подключите автопродление при следующей оплате картой',
        );
      if (
        input.nextPlan &&
        !['STANDARD', 'LITE', 'BUSINESS'].includes(input.nextPlan)
      )
        throw new BadRequestException('Неизвестный тариф');
      if (input.nextPlan === 'BUSINESS' && account.plan !== 'BUSINESS')
        throw new BadRequestException('Для повышения оплатите Бизнес');
      const newReset = input.timezone
        ? nextMidnight(new Date(), input.timezone)
        : null;
      await tx.billingTestAccount.update({
        where: { providerId },
        data: {
          timezone: input.timezone,
          ...(newReset
            ? {
                quotaResetAt:
                  account.quotaResetAt && account.quotaResetAt > newReset
                    ? account.quotaResetAt
                    : newReset,
              }
            : {}),
          autoRenew: input.nextPlan === 'STANDARD' ? false : input.autoRenew,
          nextPlan:
            input.nextPlan === undefined &&
            input.autoRenew === true &&
            account.nextPlan === 'STANDARD'
              ? null
              : input.nextPlan,
          ...(input.autoRenew !== undefined || input.nextPlan !== undefined
            ? { consentVersion: { increment: 1 } }
            : {}),
        },
      });
    });
    return this.overview(userId, providerId);
  }
}

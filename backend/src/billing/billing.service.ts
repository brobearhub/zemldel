import {
  effectivePlan,
  entitlementPlan,
  planEnforcementEnabled,
  nextMidnight,
  PLAN_LIMITS,
  upgradeAmount,
  purchaseMode,
} from './plan-policy';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LegalDocsService } from '../legal-docs/legal-docs.service';
import { purchaseSnapshot } from './billing-consent';
import {
  CUSTOM_SLUG_PATTERN,
  lockProviderSlugs,
  providerSlugTaken,
} from '../providers/provider-slug-availability';
import { randomUUID } from 'node:crypto';
import type { BillingOrder, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { billingReceipt, receiptEmail } from './billing-receipt';
import {
  addCalendarMonths,
  PLAN_PRODUCTS,
  isPlanProduct,
  planProduct,
  type BillingPeriod,
  BILLING_PRODUCTS,
  CLOSED_STATUSES,
  REFUND_STATUSES,
  type BillingProduct,
} from './billing-catalog';
import {
  billingConfig,
  bankRedirectDueDate,
  safePaymentUrl,
  TbankClient,
  verifyBankToken,
} from './tbank';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bank: TbankClient,
    private readonly legalDocs: LegalDocsService,
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

  view(order: BillingOrder) {
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
      this.prisma.billingAccount.findUnique({ where: { providerId } }),
      this.prisma.billingOrder.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);
    let config: ReturnType<typeof billingConfig> | undefined;
    let configurationError: string | null = null;
    try {
      config = billingConfig();
    } catch (error) {
      configurationError =
        error instanceof ServiceUnavailableException
          ? error.message
          : 'Не удалось проверить настройки оплаты';
    }
    return {
      catalog: PLAN_PRODUCTS,
      mode:
        config?.mode ?? (process.env.TBANK_MODE === 'live' ? 'live' : 'test'),
      enabled: Boolean(config),
      configurationError,
      canPay: member.role === 'OWNER',
      plan: effectivePlan(account),
      entitlementPlan: entitlementPlan(account),
      enforcementEnabled: planEnforcementEnabled(),
      limits: PLAN_LIMITS[entitlementPlan(account)],
      autoRenew: account?.autoRenew ?? false,
      renewalPending: orders.some(
        (order) =>
          order.autoRenew &&
          order.terminalKey === config?.terminalKey &&
          !order.renewalCycle &&
          order.consentVersion === account?.consentVersion &&
          (!CLOSED_STATUSES.includes(order.status) ||
            (order.status === 'CONFIRMED' &&
              !order.rebillId &&
              !account?.rebillId)),
      ),
      canAutoRenew: config
        ? Boolean(
            await this.getRenewalMandate(
              providerId,
              account?.rebillId,
              config.terminalKey,
            ),
          )
        : false,
      nextPlan: account?.nextPlan ?? null,
      billingPeriod: account?.billingPeriod ?? 'MONTH',
      nextBillingPeriod: account?.nextBillingPeriod ?? null,
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

  async getRenewalMandate(
    providerId: string,
    rebillId: string | null | undefined,
    terminalKey: string,
    db: Pick<PrismaService, 'billingOrder'> = this.prisma,
  ) {
    if (!rebillId) return null;
    return db.billingOrder.findFirst({
      where: {
        providerId,
        rebillId,
        terminalKey,
        autoRenew: true,
        status: 'CONFIRMED',
        receiptEmail: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, receiptEmail: true },
    });
  }

  async checkout(
    userId: string,
    providerId: string,
    product: BillingProduct,
    operationId: string,
    autoRenew = false,
    quoteAt?: string,
    expectedAmount?: number,
    acceptedOfferVersion?: string,
    expectedRenewalAmount?: number,
  ) {
    await this.authorize(userId, providerId, true);
    if (product === 'REPLIES_10')
      throw new BadRequestException(
        'Отклики на свободные заявки без ограничений',
      );
    if (!isPlanProduct(product))
      throw new BadRequestException(
        'Для смены адреса используйте настройки профиля',
      );
    const config = billingConfig();
    const selected = BILLING_PRODUCTS[product];
    if (!selected) throw new BadRequestException('Неизвестный продукт');
    const { order, created } = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerId);
      const previous = await tx.billingOrder.findUnique({
        where: { providerId_operationId: { providerId, operationId } },
      });
      if (previous) {
        if (
          previous.product !== product ||
          previous.autoRenew !== autoRenew ||
          previous.terminalKey !== config.terminalKey
        )
          throw new ConflictException(
            'Эта операция уже использована для другого продукта',
          );
        return { order: previous, created: false };
      }
      const pending = await tx.billingOrder.findFirst({
        where: {
          providerId,
          product: { not: 'PROVIDER_SLUG_CHANGE' },
          terminalKey: config.terminalKey,
          status: { notIn: CLOSED_STATUSES },
          expiresAt: { gt: new Date() },
        },
      });
      if (pending)
        throw new ConflictException(
          'Есть незавершённая оплата. Продолжите её или проверьте статус в истории.',
        );
      const account = await tx.billingAccount.findUnique({
        where: { providerId },
      });
      if (account?.needsReview)
        throw new ConflictException(
          'Возврат платежа требует проверки. Новые тестовые покупки временно недоступны.',
        );
      const mode = purchaseMode(account, product);
      if (mode === 'schedule')
        throw new ConflictException(
          'Запланируйте смену тарифа или периода после окончания оплаченного срока',
        );
      if (mode === 'current')
        throw new ConflictException(
          'Тариф уже оплачен. Следующий период можно оплатить по окончании текущего срока или включить автопродление.',
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
      const buyer = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      const email = receiptEmail(buyer.email);
      const offer = await this.acceptedOffer(acceptedOfferVersion);
      if (autoRenew && expectedRenewalAmount !== PLAN_PRODUCTS[product].amount)
        throw new ConflictException(
          'Стоимость продления изменилась. Проверьте условия ещё раз',
        );
      const consent = await tx.billingAccount.upsert({
        where: { providerId },
        create: { providerId, consentVersion: 1 },
        update: { consentVersion: { increment: 1 } },
      });
      await tx.billingConsent.create({
        data: {
          providerId,
          version: consent.consentVersion,
          actorUserId: userId,
          action: 'CHECKOUT',
          offerVersion: offer.version,
          offerMarkdown: offer.markdown,
          snapshot: purchaseSnapshot(product, amount, autoRenew),
        },
      });
      return {
        created: true,
        order: await tx.billingOrder.create({
          data: {
            id: randomUUID(),
            providerId,
            product,
            operationId,
            amount,
            receiptEmail: email,
            autoRenew,
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

  async initialize(order: BillingOrder) {
    const config = billingConfig();
    if (order.terminalKey !== config.terminalKey)
      throw new BadRequestException('Платёж создан для другого терминала');
    const selected = BILLING_PRODUCTS[order.product as BillingProduct];
    const providerId = order.providerId;
    const returnUrl =
      order.product === 'PROVIDER_SLUG_CHANGE'
        ? `${config.siteUrl}/pro/settings/profile?slugOrder=${order.id}`
        : `${config.siteUrl}/pro/settings/tariff?order=${order.id}`;
    // Persist first, then exactly one Init. A lost response is recovered by CheckOrder.
    const result = await this.bank.call('Init', {
      Amount: order.amount,
      OrderId: order.id,
      Description: selected.title,
      Receipt: billingReceipt(order.receiptEmail, selected.title, order.amount),
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
      RedirectDueDate: bankRedirectDueDate(order.expiresAt),
      NotificationURL: config.notificationUrl,
      SuccessURL: returnUrl,
      FailURL: returnUrl,
    });
    if (result.Success === false) {
      await this.prisma.billingOrder.updateMany({
        where: { id: order.id, status: 'INITIALIZING' },
        data: { status: 'INIT_FAILED' },
      });
      const errorCode =
        typeof result.ErrorCode === 'string' ||
        typeof result.ErrorCode === 'number'
          ? String(result.ErrorCode)
          : '';
      throw new ServiceUnavailableException(
        /^\d{1,10}$/.test(errorCode)
          ? `Банк не создал платёж. Код ошибки банка: ${errorCode}.`
          : 'Банк не создал платёж. Проверьте настройки терминала.',
      );
    }
    if (result.Success !== true)
      throw new ServiceUnavailableException('Некорректный ответ банка');
    this.validatePayment(order, result);
    const paymentUrl = safePaymentUrl(result.PaymentURL);
    const saved = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerId);
      const current = await tx.billingOrder.findUniqueOrThrow({
        where: { id: order.id },
      });
      this.validatePayment(current, result);
      return tx.billingOrder.update({
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
    order: BillingOrder,
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
    let order = await this.prisma.billingOrder.findFirst({
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
    order = await this.prisma.billingOrder.findUniqueOrThrow({
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
    const snapshot = await this.prisma.billingOrder.findUnique({
      where: { id: payload.OrderId },
    });
    if (!snapshot) throw new NotFoundException('Платёж не найден');
    const status = typeof payload.Status === 'string' ? payload.Status : '';
    if (!/^[A-Z_]{2,40}$/.test(status))
      throw new BadRequestException('Некорректный статус');
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, snapshot.providerId);
      const order = await tx.billingOrder.findUniqueOrThrow({
        where: { id: snapshot.id },
      });
      const refund = REFUND_STATUSES.includes(status);
      // An unpaid canceled payment has a zero current amount in GetState.
      const canceledBeforePayment =
        status === 'CANCELED' && !order.fulfilledAt && payload.Amount === 0;
      this.validatePayment(order, payload, refund || canceledBeforePayment);
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
        await tx.billingOrder.update({
          where: { id: order.id },
          data: { rebillId },
        });
        if (order.fulfilledAt && !REFUND_STATUSES.includes(order.status))
          await tx.billingAccount.updateMany({
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
        if (order.product === 'PROVIDER_SLUG_CHANGE') {
          await tx.providerSlugChange.update({
            where: { orderId: order.id },
            data: { needsReview: true, reservedSlug: null },
          });
        } else {
          await tx.billingAccount.upsert({
            where: { providerId: order.providerId },
            create: { providerId: order.providerId, needsReview: true },
            update: { needsReview: true, autoRenew: false },
          });
        }
      }
      if (order.product === 'PROVIDER_SLUG_CHANGE') {
        await this.applySlugChange(tx, order, status);
        await tx.billingOrder.update({
          where: { id: order.id },
          data: {
            paymentId: String(payload.PaymentId),
            status,
            ...(status === 'CONFIRMED' ? { fulfilledAt: new Date() } : {}),
          },
        });
        return;
      }
      if (status === 'CONFIRMED') {
        const account = await tx.billingAccount.upsert({
          where: { providerId: order.providerId },
          create: { providerId: order.providerId },
          update: {},
        });
        const now = new Date();
        if (order.product === 'REPLIES_10') {
          await tx.billingAccount.update({
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
            await tx.billingAccount.update({
              where: { providerId: order.providerId },
              data: { needsReview: true, autoRenew: false },
            });
            await tx.billingOrder.update({
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
          if (!isPlanProduct(order.product))
            throw new BadRequestException('Неизвестный продукт');
          const selected = PLAN_PRODUCTS[order.product];
          const start = order.renewalCycle ?? now;
          const savedMandate = rebillId ?? order.rebillId;
          const consentCurrent =
            account.consentVersion === order.consentVersion;
          await tx.billingAccount.update({
            where: { providerId: order.providerId },
            data: {
              plan: selected.plan,
              billingPeriod: selected.period,
              planStartedAt: start,
              planExpiresAt: addCalendarMonths(start, selected.months),
              graceUntil: null,
              ...(consentCurrent
                ? { nextPlan: null, nextBillingPeriod: null }
                : {}),
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
          if (
            order.autoRenew &&
            consentCurrent &&
            !order.renewalCycle &&
            !savedMandate
          )
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
      await tx.billingOrder.update({
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
    if (product === 'REPLIES_10')
      throw new BadRequestException(
        'Отклики на свободные заявки без ограничений',
      );
    if (!isPlanProduct(product))
      throw new BadRequestException(
        'Для смены адреса используйте настройки профиля',
      );
    const account = await this.prisma.billingAccount.findUnique({
      where: { providerId },
    });
    const now = new Date();
    const offer = await this.legalDocs.getCurrent('offer');
    return {
      product,
      offerVersion: offer.version,
      regularAmount: PLAN_PRODUCTS[product].amount,
      mode: purchaseMode(account, product, now),
      amount: upgradeAmount(account, product, now),
      quoteAt: now.toISOString(),
    };
  }

  async settings(
    userId: string,
    providerId: string,
    input: {
      timezone?: string;
      autoRenew?: boolean;
      nextPlan?: string | null;
      nextBillingPeriod?: BillingPeriod | null;
      acceptedOfferVersion?: string;
      expectedRenewalAmount?: number;
    },
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
      const account = await tx.billingAccount.upsert({
        where: { providerId },
        create: { providerId },
        update: {},
      });
      if (
        input.autoRenew &&
        !(await this.getRenewalMandate(
          providerId,
          account.rebillId,
          billingConfig().terminalKey,
          tx,
        ))
      )
        throw new BadRequestException(
          'Подключите автопродление при следующей оплате картой',
        );
      if (
        input.nextPlan &&
        !['STANDARD', 'LITE', 'BUSINESS'].includes(input.nextPlan)
      )
        throw new BadRequestException('Неизвестный тариф');
      if (
        input.nextBillingPeriod &&
        !['MONTH', 'YEAR'].includes(input.nextBillingPeriod)
      )
        throw new BadRequestException('Неизвестный период оплаты');
      const cancellation = input.nextPlan === 'STANDARD';
      const resume =
        input.autoRenew === true &&
        account.nextPlan === 'STANDARD' &&
        input.nextPlan === undefined;
      const nextPlan = resume ? null : input.nextPlan;
      const nextBillingPeriod =
        cancellation || nextPlan === null ? null : input.nextBillingPeriod;
      if (
        input.nextBillingPeriod &&
        !planProduct(input.nextPlan ?? account.nextPlan ?? account.plan)
      )
        throw new BadRequestException(
          'Выберите платный тариф для следующего периода',
        );
      const newReset = input.timezone
        ? nextMidnight(new Date(), input.timezone)
        : null;
      const changesRenewal =
        input.autoRenew !== undefined ||
        input.nextPlan !== undefined ||
        input.nextBillingPeriod !== undefined;
      const willRenew = cancellation
        ? false
        : (input.autoRenew ?? account.autoRenew);
      const renewalProduct = planProduct(
        nextPlan === undefined
          ? (account.nextPlan ?? account.plan)
          : (nextPlan ?? account.plan),
        nextBillingPeriod === undefined
          ? (account.nextBillingPeriod ?? account.billingPeriod)
          : (nextBillingPeriod ?? account.billingPeriod),
      );
      const offer =
        changesRenewal && willRenew
          ? await this.acceptedOffer(input.acceptedOfferVersion)
          : null;
      if (
        changesRenewal &&
        willRenew &&
        (!renewalProduct ||
          input.expectedRenewalAmount !== PLAN_PRODUCTS[renewalProduct].amount)
      )
        throw new ConflictException(
          'Стоимость продления изменилась. Проверьте условия ещё раз',
        );
      const updated = await tx.billingAccount.update({
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
          autoRenew: cancellation ? false : input.autoRenew,
          nextPlan,
          nextBillingPeriod,
          ...(input.autoRenew !== undefined ||
          input.nextPlan !== undefined ||
          input.nextBillingPeriod !== undefined
            ? { consentVersion: { increment: 1 } }
            : {}),
        },
      });
      if (changesRenewal) {
        await tx.billingConsent.create({
          data: {
            providerId,
            version: updated.consentVersion,
            actorUserId: userId,
            action: willRenew ? 'RENEWAL_ENABLED' : 'RENEWAL_DISABLED',
            offerVersion: offer?.version,
            offerMarkdown: offer?.markdown,
            snapshot: renewalProduct
              ? purchaseSnapshot(
                  renewalProduct,
                  PLAN_PRODUCTS[renewalProduct].amount,
                  willRenew,
                )
              : { autoRenew: false, product: 'STANDARD' },
          },
        });
      }
    });
    return this.overview(userId, providerId);
  }

  async slugChangeStatus(userId: string, providerId: string) {
    await this.authorize(userId, providerId, true);
    const provider = await this.prisma.provider.findUniqueOrThrow({
      where: { id: providerId },
      select: { slug: true, slugChangedAt: true },
    });
    const order = await this.prisma.billingOrder.findFirst({
      where: { providerId, product: 'PROVIDER_SLUG_CHANGE' },
      orderBy: { createdAt: 'desc' },
      include: { slugChange: true },
    });
    return {
      slug: provider.slug,
      nextChangeAt: provider.slugChangedAt
        ? addCalendarMonths(provider.slugChangedAt, 1)
        : null,
      amount: BILLING_PRODUCTS.PROVIDER_SLUG_CHANGE.amount,
      enabled: this.paymentEnabled(),
      order: order
        ? {
            ...this.view(order),
            targetSlug: order.slugChange?.targetSlug,
            appliedAt: order.slugChange?.appliedAt,
            needsReview: order.slugChange?.needsReview,
            expiresAt: order.expiresAt,
          }
        : null,
    };
  }

  async slugQuote(userId: string, providerId: string, slug: string) {
    await this.authorize(userId, providerId, true);
    const target = slug.trim().toLowerCase();
    if (!CUSTOM_SLUG_PATTERN.test(target))
      throw new BadRequestException(
        'Введите только английские буквы и цифры, до 64 символов',
      );
    const provider = await this.prisma.provider.findUniqueOrThrow({
      where: { id: providerId },
    });
    this.assertSlugChangeAllowed(provider, target);
    if (await providerSlugTaken(this.prisma, target))
      throw new ConflictException('Этот адрес уже занят. Выберите другой');
    return {
      slug: target,
      available: true,
      amount: BILLING_PRODUCTS.PROVIDER_SLUG_CHANGE.amount,
      offerVersion: await this.currentOfferVersion(),
      enabled: this.paymentEnabled(),
    };
  }

  private paymentEnabled() {
    try {
      billingConfig();
      return true;
    } catch {
      return false;
    }
  }

  private assertSlugChangeAllowed(
    provider: { slug: string; slugChangedAt: Date | null },
    target: string,
  ) {
    if (provider.slug === target)
      throw new BadRequestException('Это текущий адрес профиля');
    const next = provider.slugChangedAt
      ? addCalendarMonths(provider.slugChangedAt, 1)
      : null;
    if (next && next > new Date())
      throw new ConflictException(
        `Менять адрес можно один раз в месяц. Следующая смена доступна с ${next.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
      );
  }

  async checkoutSlugChange(
    userId: string,
    providerId: string,
    input: {
      slug: string;
      operationId: string;
      acceptedOfferVersion: string;
      expectedAmount: number;
    },
  ) {
    await this.authorize(userId, providerId, true);
    const target = input.slug.trim().toLowerCase();
    if (!CUSTOM_SLUG_PATTERN.test(target))
      throw new BadRequestException(
        'Введите только английские буквы и цифры, до 64 символов',
      );
    const config = billingConfig();
    const { order, created } = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, providerId);
      const previous = await tx.billingOrder.findUnique({
        where: {
          providerId_operationId: {
            providerId,
            operationId: input.operationId,
          },
        },
        include: { slugChange: true },
      });
      if (previous) {
        if (
          previous.product !== 'PROVIDER_SLUG_CHANGE' ||
          previous.slugChange?.targetSlug !== target ||
          previous.terminalKey !== config.terminalKey
        )
          throw new ConflictException(
            'Эта операция уже использована для другой покупки',
          );
        return { order: previous, created: false };
      }
      if (input.expectedAmount !== BILLING_PRODUCTS.PROVIDER_SLUG_CHANGE.amount)
        throw new ConflictException(
          'Стоимость изменилась. Проверьте условия ещё раз',
        );
      const offer = await this.acceptedOffer(input.acceptedOfferVersion);
      const provider = await tx.provider.findUniqueOrThrow({
        where: { id: providerId },
      });
      this.assertSlugChangeAllowed(provider, target);
      const pending = await tx.billingOrder.findFirst({
        where: {
          providerId,
          product: 'PROVIDER_SLUG_CHANGE',
          status: { notIn: CLOSED_STATUSES },
          expiresAt: { gt: new Date() },
        },
      });
      if (pending)
        throw new ConflictException(
          'Уже есть незавершённая оплата смены адреса. Проверьте её статус',
        );
      await lockProviderSlugs(tx);
      if (await providerSlugTaken(tx, target))
        throw new ConflictException('Этот адрес уже занят. Выберите другой');
      const buyer = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      const expiresAt = new Date(Date.now() + 30 * 60000);
      const order = await tx.billingOrder.create({
        data: {
          providerId,
          operationId: input.operationId,
          product: 'PROVIDER_SLUG_CHANGE',
          amount: BILLING_PRODUCTS.PROVIDER_SLUG_CHANGE.amount,
          receiptEmail: receiptEmail(buyer.email),
          terminalKey: config.terminalKey,
          expiresAt,
          slugChange: {
            create: {
              actorUserId: userId,
              previousSlug: provider.slug,
              targetSlug: target,
              reservedSlug: target,
              reservedUntil: expiresAt,
              offerVersion: offer.version,
              offerMarkdown: offer.markdown,
            },
          },
        },
      });
      return { order, created: true };
    });
    return created ? this.initialize(order) : this.view(order);
  }

  private async applySlugChange(
    tx: Prisma.TransactionClient,
    order: BillingOrder,
    status: string,
  ) {
    if (!CLOSED_STATUSES.includes(status)) return;
    await lockProviderSlugs(tx);
    const change = await tx.providerSlugChange.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    if (status === 'CONFIRMED') {
      const provider = await tx.provider.findUniqueOrThrow({
        where: { id: order.providerId },
      });
      // Temporarily release this order's reservation, retaining the namespace lock.
      await tx.providerSlugChange.update({
        where: { orderId: order.id },
        data: { reservedSlug: null },
      });
      const next = provider.slugChangedAt
        ? addCalendarMonths(provider.slugChangedAt, 1)
        : null;
      if (
        provider.slug !== change.previousSlug ||
        (next && next > new Date()) ||
        (await providerSlugTaken(tx, change.targetSlug))
      ) {
        await tx.providerSlugChange.update({
          where: { orderId: order.id },
          data: { needsReview: true },
        });
        await tx.billingNotice.upsert({
          where: { key: `slug-conflict:${order.id}` },
          create: {
            providerId: order.providerId,
            key: `slug-conflict:${order.id}`,
            message:
              'Оплата смены адреса получена, но применить новый адрес не удалось. Обратитесь в поддержку для возврата или урегулирования платежа.',
          },
          update: {},
        });
        return;
      }
      const now = new Date();
      await tx.provider.update({
        where: { id: provider.id },
        data: { slug: change.targetSlug, slugChangedAt: now },
      });
      await tx.providerSlugChange.update({
        where: { orderId: order.id },
        data: { appliedAt: now },
      });
    } else {
      await tx.providerSlugChange.update({
        where: { orderId: order.id },
        data: { reservedSlug: null },
      });
    }
  }

  async currentOfferVersion() {
    return (await this.legalDocs.getCurrent('offer')).version;
  }

  private async acceptedOffer(version?: string) {
    const offer = await this.legalDocs.getCurrent('offer');
    if (!version || version !== offer.version)
      throw new ConflictException(
        'Ознакомьтесь с актуальной офертой и подтвердите её условия',
      );
    return offer;
  }
}

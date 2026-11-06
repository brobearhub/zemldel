import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { BillingTestOrder } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { TbankClient } from './tbank';
import {
  BILLING_PRODUCTS,
  CLOSED_STATUSES,
  type BillingProduct,
} from './billing-catalog';

@Injectable()
export class BillingRenewalService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(BillingRenewalService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly bank: TbankClient,
  ) {}

  onModuleInit() {
    if (
      process.env.TBANK_TEST_ENABLED !== '1' ||
      process.env.TBANK_RENEWALS_ENABLED !== '1'
    )
      return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 60000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const accounts = await this.prisma.billingTestAccount.findMany({
        where: {
          autoRenew: true,
          rebillId: { not: null },
          needsReview: false,
          planExpiresAt: { lte: new Date() },
        },
        take: 100,
        orderBy: { planExpiresAt: 'asc' },
      });
      for (const account of accounts) {
        try {
          await this.renew(account.providerId);
        } catch {
          this.logger.warn(
            'Renewal awaiting reconciliation; no automatic repeat of an uncertain charge',
          );
        }
      }
      // Reconcile in-flight charges even if the owner has since disabled renewal.
      const pending = await this.prisma.billingTestOrder.findMany({
        where: {
          renewalCycle: { not: null },
          status: { notIn: CLOSED_STATUSES },
        },
        take: 100,
        orderBy: { createdAt: 'asc' },
      });
      for (const order of pending) {
        try {
          await this.reconcile(order);
        } catch {
          /* try status again next tick, never charge twice */
        }
      }
    } catch {
      this.logger.warn('Renewal scan failed; retrying on the next tick');
    } finally {
      this.running = false;
    }
  }

  async renew(providerId: string) {
    const claim = await this.prisma.$transaction(async (tx) => {
      await this.billing.lock(tx, providerId);
      const account = await tx.billingTestAccount.findUniqueOrThrow({
        where: { providerId },
      });
      const now = new Date(),
        cycle = account.planExpiresAt;
      if (
        !account.autoRenew ||
        !account.rebillId ||
        !cycle ||
        cycle > now ||
        account.needsReview
      )
        return null;
      if (now.getTime() >= cycle.getTime() + 72 * 3600000) {
        await tx.billingTestAccount.update({
          where: { providerId },
          data: { autoRenew: false, graceUntil: null },
        });
        await tx.billingNotice.upsert({
          where: { key: `expired:${providerId}:${cycle.toISOString()}` },
          create: {
            providerId,
            key: `expired:${providerId}:${cycle.toISOString()}`,
            message:
              'Продлить тариф не удалось. Включён Стандарт. Оплатите тариф вручную, чтобы восстановить возможности.',
          },
          update: {},
        });
        return null;
      }
      const attempts = await tx.billingTestOrder.findMany({
        where: { providerId, renewalCycle: cycle },
        orderBy: { renewalAttempt: 'desc' },
      });
      if (attempts.some((o) => !CLOSED_STATUSES.includes(o.status)))
        return null;
      // Do not race a manual recovery payment.
      if (
        await tx.billingTestOrder.findFirst({
          where: {
            providerId,
            renewalCycle: null,
            status: { notIn: CLOSED_STATUSES },
            expiresAt: { gt: now },
          },
        })
      )
        return null;
      const attempt = attempts.length;
      if (
        attempt >= 3 ||
        now.getTime() < cycle.getTime() + attempt * 24 * 3600000 ||
        (attempts[0] &&
          now.getTime() < attempts[0].createdAt.getTime() + 24 * 3600000)
      )
        return null;
      const product = (account.nextPlan ?? account.plan) as BillingProduct;
      if (product !== 'LITE' && product !== 'BUSINESS') return null;
      await tx.billingTestAccount.update({
        where: { providerId },
        data: { graceUntil: new Date(cycle.getTime() + 72 * 3600000) },
      });
      return tx.billingTestOrder.create({
        data: {
          id: randomUUID(),
          providerId,
          operationId: randomUUID(),
          product,
          amount: BILLING_PRODUCTS[product].amount,
          terminalKey: process.env.TBANK_TERMINAL_KEY!,
          autoRenew: true,
          rebillId: account.rebillId,
          consentVersion: account.consentVersion,
          renewalCycle: cycle,
          renewalAttempt: attempt,
          expiresAt: new Date(now.getTime() + 30 * 60000),
        },
      });
    });
    if (!claim) return;
    try {
      await this.billing.initialize(claim);
      await this.charge(
        await this.prisma.billingTestOrder.findUniqueOrThrow({
          where: { id: claim.id },
        }),
      );
    } catch {
      await this.notice(
        claim,
        'Не удалось подтвердить автопродление. Проверяем статус банка. Возможности тарифа сохраняются до конца трёхдневного льготного периода.',
      );
      throw new Error('Renewal pending');
    }
  }

  private async charge(order: BillingTestOrder) {
    const allowed = await this.prisma.$transaction(async (tx) => {
      await this.billing.lock(tx, order.providerId);
      const current = await tx.billingTestOrder.findUniqueOrThrow({
        where: { id: order.id },
      });
      const account = await tx.billingTestAccount.findUniqueOrThrow({
        where: { providerId: order.providerId },
      });
      if (
        current.chargeStartedAt ||
        current.status !== 'NEW' ||
        !current.paymentId
      )
        return false;
      if (
        !account.autoRenew ||
        account.consentVersion !== order.consentVersion ||
        account.planExpiresAt?.getTime() !== order.renewalCycle?.getTime() ||
        account.needsReview
      ) {
        await tx.billingTestOrder.update({
          where: { id: order.id },
          data: { status: 'CANCELED' },
        });
        return false;
      }
      await tx.billingTestOrder.update({
        where: { id: order.id },
        data: { chargeStartedAt: new Date() },
      });
      return true;
    });
    if (!allowed) return;
    // Once claimed, never repeat Charge, even after a crash or lost response.
    await this.bank.call('Charge', {
      PaymentId: order.paymentId,
      RebillId: order.rebillId,
    });
    await this.reconcile(
      await this.prisma.billingTestOrder.findUniqueOrThrow({
        where: { id: order.id },
      }),
    );
  }

  private async reconcile(order: BillingTestOrder) {
    let paymentId = order.paymentId;
    if (!paymentId) {
      const check = await this.bank.call('CheckOrder', { OrderId: order.id });
      if (
        check.Success !== true ||
        check.TerminalKey !== order.terminalKey ||
        check.OrderId !== order.id ||
        !Array.isArray(check.Payments) ||
        check.Payments.length !== 1
      ) {
        if (
          order.expiresAt < new Date() &&
          check.Success === true &&
          Array.isArray(check.Payments) &&
          check.Payments.length === 0
        )
          await this.prisma.billingTestOrder.updateMany({
            where: { id: order.id, status: 'INITIALIZING' },
            data: { status: 'INIT_FAILED' },
          });
        return;
      }
      paymentId = String(
        (check.Payments[0] as { PaymentId: string }).PaymentId,
      );
    }
    const state = await this.bank.call('GetState', { PaymentId: paymentId });
    if (state.OrderId !== order.id) throw new Error('Order mismatch');
    await this.billing.applyState(state, true);
    const current = await this.prisma.billingTestOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    if (current.status === 'NEW' && !current.chargeStartedAt)
      await this.charge(current);
    if (
      CLOSED_STATUSES.includes(current.status) &&
      current.status !== 'CONFIRMED'
    )
      await this.notice(
        order,
        order.renewalAttempt === 2
          ? 'Три попытки автоматической оплаты не прошли. Оплатите тариф вручную до окончания льготного периода, чтобы сохранить доступ.'
          : 'Автоматическая оплата не прошла. Следующая попытка — через 24 часа, в пределах трёхдневного льготного периода. Вы можете оплатить тариф вручную.',
      );
  }

  private async notice(order: BillingTestOrder, message: string) {
    await this.prisma.billingNotice.upsert({
      where: { key: `renewal:${order.id}` },
      create: {
        providerId: order.providerId,
        key: `renewal:${order.id}`,
        message,
      },
      update: {},
    });
  }
}

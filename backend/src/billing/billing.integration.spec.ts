import { PlanService } from './plan.service';
import { WorkspaceService } from './workspace.service';
import { BillingRenewalService } from './billing-renewal.service';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { bankToken, type TbankClient } from './tbank';

// Opt in only to a disposable local database; never uses the application's DB.
const url = process.env.BILLING_TEST_DATABASE_URL;
const allowed =
  url &&
  ['localhost', '127.0.0.1'].includes(new URL(url).hostname) &&
  new URL(url).pathname === '/billing_qa';
describe.skipIf(!allowed)('billing with PostgreSQL transactions', () => {
  let prisma: PrismaService;
  let service: BillingService;
  const call = vi.fn();
  const users: string[] = [];
  const providers: string[] = [];
  let userId: string;
  let providerId: string;

  beforeAll(() => {
    vi.stubEnv('DATABASE_URL', url);
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'qaDEMO');
    vi.stubEnv('TBANK_PASSWORD', 'test-secret');
    vi.stubEnv('TBANK_SITE_URL', 'https://example.test');
    vi.stubEnv(
      'TBANK_NOTIFICATION_URL',
      'https://example.test/api/billing/tbank/notification',
    );
    prisma = new PrismaService();
    service = new BillingService(prisma, { call } as unknown as TbankClient);
  });
  beforeEach(async () => {
    call.mockReset();
    userId = randomUUID();
    providerId = randomUUID();
    users.push(userId);
    providers.push(providerId);
    await prisma.user.create({
      data: { id: userId, email: `${userId}@example.test` },
    });
    await prisma.provider.create({
      data: {
        id: providerId,
        name: 'Billing QA',
        slug: providerId,
        type: 'INDIVIDUAL',
        ownerUserId: userId,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
    call.mockImplementation(
      (method: string, input: Record<string, unknown>) => {
        if (method !== 'Init') throw new Error('Unexpected call');
        return {
          Success: true,
          ErrorCode: '0',
          TerminalKey: 'qaDEMO',
          Amount: input.Amount,
          OrderId: input.OrderId,
          Status: 'NEW',
          PaymentId:
            String(Date.now()) + String(Math.floor(Math.random() * 100000)),
          PaymentURL: 'https://pay.tbank.ru/new/test',
        };
      },
    );
  });
  afterAll(async () => {
    await prisma.request.deleteMany({
      where: { conversations: { some: { providerId: { in: providers } } } },
    });
    await prisma.billingTestOrder.deleteMany({
      where: { providerId: { in: providers } },
    });
    await prisma.billingTestAccount.deleteMany({
      where: { providerId: { in: providers } },
    });
    await prisma.providerMember.deleteMany({
      where: { providerId: { in: providers } },
    });
    await prisma.provider.deleteMany({ where: { id: { in: providers } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });
  async function notification(
    orderId: string,
    status = 'CONFIRMED',
    changes: Record<string, unknown> = {},
  ) {
    const order = await prisma.billingTestOrder.findUniqueOrThrow({
      where: { id: orderId },
    });
    const data = {
      OrderId: order.id,
      TerminalKey: 'qaDEMO',
      Amount: order.amount,
      PaymentId: order.paymentId,
      Status: status,
      Success: true,
      ErrorCode: '0',
      ...changes,
    };
    return service.notification({
      ...data,
      Token: bankToken(data, 'test-secret'),
    });
  }

  it('applies the checked-in migration to a fresh schema', async () => {
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE SCHEMA billing_migration_qa');
      await client.query('SET LOCAL search_path TO billing_migration_qa');
      await client.query('CREATE TABLE "Provider" ("id" UUID PRIMARY KEY)');
      await client.query(
        readFileSync(
          'prisma/migrations/20261106200000_billing_test/migration.sql',
          'utf8',
        ),
      );
      await client.query(
        'CREATE TABLE "Service" (id UUID PRIMARY KEY); CREATE TABLE "Request" (id UUID PRIMARY KEY, "serviceId" UUID, "categoryId" UUID, "customerUserId" UUID); CREATE TABLE "Conversation" (id UUID, "providerId" UUID, "requestId" UUID); CREATE TABLE "Message" ("conversationId" UUID, "senderUserId" UUID, kind TEXT); CREATE TABLE "ProviderMember" ("providerId" UUID, "userId" UUID)',
      );
      await client.query(
        readFileSync(
          'prisma/migrations/20261106210000_plan_entitlements/migration.sql',
          'utf8',
        ),
      );
      const result = await client.query<{ count: string }>(
        'SELECT count(*) FROM "BillingTestOrder"',
      );
      expect(result.rows[0].count).toBe('0');
    } finally {
      await client.query('ROLLBACK');
      await client.end();
    }
  });
  it('creates exactly one bank payment for concurrent duplicate operations', async () => {
    const operationId = randomUUID();
    const orders = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.checkout(userId, providerId, 'LITE', operationId),
      ),
    );
    expect(new Set(orders.map((o) => o.id)).size).toBe(1);
    expect(call).toHaveBeenCalledTimes(1);
    expect(orders[0].amount).toBe(29900);
    await expect(
      service.checkout(userId, providerId, 'BUSINESS', operationId),
    ).rejects.toThrow();
  });
  it('blocks non-members and managers from checkout', async () => {
    await expect(
      service.checkout(randomUUID(), providerId, 'LITE', randomUUID()),
    ).rejects.toThrow();
    await prisma.providerMember.update({
      where: { providerId_userId: { providerId, userId } },
      data: { role: 'MANAGER' },
    });
    await expect(
      service.checkout(userId, providerId, 'LITE', randomUUID()),
    ).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
  });
  it('does not grant on AUTHORIZED; grants exactly once on simultaneous confirmations', async () => {
    const order = await service.checkout(
      userId,
      providerId,
      'REPLIES_10',
      randomUUID(),
    );
    await notification(order.id, 'AUTHORIZED');
    expect((await service.overview(userId, providerId)).replyCredits).toBe(0);
    await Promise.all(Array.from({ length: 8 }, () => notification(order.id)));
    await notification(order.id, 'AUTHORIZED');
    const overview = await service.overview(userId, providerId);
    expect(overview.replyCredits).toBe(10);
    expect(overview.orders[0].status).toBe('CONFIRMED');
  });
  it('rejects forged notifications and mismatched payment details', async () => {
    const order = await service.checkout(
      userId,
      providerId,
      'LITE',
      randomUUID(),
    );
    await expect(
      service.notification({ OrderId: order.id, Token: 'bad' }),
    ).rejects.toThrow();
    for (const changes of [
      { Amount: 1 },
      { PaymentId: '99999999' },
      { TerminalKey: 'otherDEMO' },
      { Success: false },
    ]) {
      await expect(
        notification(order.id, 'CONFIRMED', changes),
      ).rejects.toThrow();
    }
    expect((await service.overview(userId, providerId)).plan).toBe('STANDARD');
  });
  it('preserves expiry on duplicate notifications and blocks accidental early renewal', async () => {
    const first = await service.checkout(
      userId,
      providerId,
      'LITE',
      randomUUID(),
    );
    await notification(first.id);
    const expiry = (await service.overview(userId, providerId)).planExpiresAt!;
    await notification(first.id);
    expect((await service.overview(userId, providerId)).planExpiresAt).toEqual(
      expiry,
    );
    await expect(
      service.checkout(userId, providerId, 'LITE', randomUUID()),
    ).rejects.toThrow('Тариф уже оплачен');
  });
  it('records refund for review and ignores delayed confirmation', async () => {
    const order = await service.checkout(
      userId,
      providerId,
      'REPLIES_10',
      randomUUID(),
    );
    await notification(order.id);
    await notification(order.id, 'PARTIAL_REFUNDED', { Amount: 5000 });
    await notification(order.id);
    const overview = await service.overview(userId, providerId);
    expect(overview.replyCredits).toBe(10);
    expect(overview.needsReview).toBe(true);
    expect(overview.orders[0].status).toBe('PARTIAL_REFUNDED');
    await expect(
      service.checkout(userId, providerId, 'LITE', randomUUID()),
    ).rejects.toThrow();
  });
  it('recovers a lost Init response through CheckOrder/GetState without a new Init', async () => {
    call.mockRejectedValueOnce(new Error('timeout'));
    const operationId = randomUUID();
    await expect(
      service.checkout(userId, providerId, 'BUSINESS', operationId),
    ).rejects.toThrow();
    const order = await service.checkout(
      userId,
      providerId,
      'BUSINESS',
      operationId,
    );
    expect(call).toHaveBeenCalledTimes(1);
    call.mockImplementation((method: string) =>
      method === 'CheckOrder'
        ? {
            Success: true,
            TerminalKey: 'qaDEMO',
            OrderId: order.id,
            Payments: [{ PaymentId: '123456' }],
          }
        : {
            Success: true,
            ErrorCode: '0',
            TerminalKey: 'qaDEMO',
            OrderId: order.id,
            Amount: 99900,
            PaymentId: '123456',
            Status: 'CONFIRMED',
          },
    );
    await service.refresh(userId, providerId, order.id);
    expect((await service.overview(userId, providerId)).plan).toBe('BUSINESS');
    await expect(
      service.checkout(userId, providerId, 'REPLIES_10', randomUUID()),
    ).rejects.toThrow();
  });
  it('does not permit reading or refreshing another profile payment', async () => {
    const order = await service.checkout(
      userId,
      providerId,
      'LITE',
      randomUUID(),
    );
    await expect(
      service.refresh(randomUUID(), providerId, order.id),
    ).rejects.toThrow();
    await expect(service.overview(randomUUID(), providerId)).rejects.toThrow();
  });
  async function conversation() {
    const customer = randomUUID();
    users.push(customer);
    await prisma.user.create({
      data: { id: customer, email: `${customer}@example.test` },
    });
    const request = await prisma.request.create({
      data: { customerUserId: customer },
    });
    return prisma.conversation.create({
      data: { providerId, requestId: request.id, customerUserId: customer },
    });
  }

  it('serializes the shared daily quota, reserves and duplicate replies', async () => {
    const plans = new PlanService(prisma);
    const conversations = await Promise.all(
      Array.from({ length: 6 }, conversation),
    );
    const send = (id: string) =>
      prisma.$transaction((tx) => plans.consumeReply(tx, userId, id));
    const results = await Promise.allSettled(
      conversations.map((c) => send(c.id)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    expect((await service.overview(userId, providerId)).dailyUsed).toBe(5);
    const index = results.findIndex((r) => r.status === 'rejected');
    await prisma.billingTestAccount.update({
      where: { providerId },
      data: { replyCredits: 10 },
    });
    await Promise.all(
      Array.from({ length: 4 }, () => send(conversations[index].id)),
    );
    expect((await service.overview(userId, providerId)).replyCredits).toBe(9);
    expect(await prisma.replyDebit.count({ where: { providerId } })).toBe(6);
    const reset = (await service.overview(userId, providerId)).quotaResetAt;
    await service.settings(userId, providerId, { timezone: 'Asia/Kamchatka' });
    await expect(
      service.settings(userId, providerId, { timezone: '' }),
    ).rejects.toThrow('Неизвестный часовой пояс');
    const after = await service.overview(userId, providerId);
    expect(after.timezone).toBe('Asia/Kamchatka');
    expect(after.dailyUsed).toBe(5);
    expect(after.quotaResetAt.getTime()).toBeGreaterThanOrEqual(
      reset.getTime(),
    );
  });

  it('rolls back quota when message storage fails', async () => {
    const conv = await conversation();
    const plans = new PlanService(prisma);
    await expect(
      prisma.$transaction(async (tx) => {
        await plans.consumeReply(tx, userId, conv.id);
        throw new Error('message failed');
      }),
    ).rejects.toThrow();
    expect(await prisma.replyDebit.count({ where: { providerId } })).toBe(0);
    expect((await service.overview(userId, providerId)).dailyUsed).toBe(0);
  });

  it('retains readable templates/tasks but blocks edits after downgrade', async () => {
    const plans = new PlanService(prisma),
      workspace = new WorkspaceService(prisma, plans);
    await prisma.billingTestAccount.create({
      data: {
        providerId,
        plan: 'BUSINESS',
        planExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    const template = {
      id: randomUUID(),
      title: 'Приветствие',
      body: 'Здравствуйте',
      shared: true,
    };
    const task = {
      id: randomUUID(),
      title: 'Проверить',
      note: 'Внутренняя заметка',
      done: false,
      assigneeUserId: userId,
    };
    await workspace.template(userId, providerId, template);
    await workspace.task(userId, providerId, task);
    await prisma.billingTestAccount.update({
      where: { providerId },
      data: { planExpiresAt: new Date(0) },
    });
    const read = await workspace.read(userId, providerId);
    expect(read.templates).toHaveLength(1);
    expect(read.tasks).toHaveLength(1);
    expect(read.limits.team).toBe(false);
    expect(read.stats.byService).toBeUndefined();
    await expect(
      workspace.template(userId, providerId, template),
    ).rejects.toThrow();
    await expect(workspace.task(userId, providerId, task)).rejects.toThrow();
    await expect(workspace.read(randomUUID(), providerId)).rejects.toThrow();
  });

  it('uses the quoted prorated amount and saves mandate arriving after confirmation', async () => {
    const now = Date.now();
    await prisma.billingTestAccount.create({
      data: {
        providerId,
        plan: 'LITE',
        planStartedAt: new Date(now - 15 * 86400000),
        planExpiresAt: new Date(now + 15 * 86400000),
      },
    });
    const quote = await service.quote(userId, providerId, 'BUSINESS');
    expect(quote.amount).toBeGreaterThanOrEqual(84950);
    expect(quote.amount).toBeLessThan(84960);
    const order = await service.checkout(
      userId,
      providerId,
      'BUSINESS',
      randomUUID(),
      true,
      quote.quoteAt,
      quote.amount,
    );
    expect(order.amount).toBe(quote.amount);
    expect(call.mock.calls[0][1]).toMatchObject({
      Recurrent: 'Y',
      CustomerKey: providerId,
      DATA: { OperationInitiatorType: '1' },
    });
    await notification(order.id);
    await notification(order.id, 'AUTHORIZED', { RebillId: '123456789' });
    expect((await service.overview(userId, providerId)).autoRenew).toBe(true);
    await service.settings(userId, providerId, { autoRenew: false });
    await notification(order.id, 'AUTHORIZED', { RebillId: '123456789' });
    expect((await service.overview(userId, providerId)).autoRenew).toBe(false);
  });

  it('renews once across workers and honors a scheduled lower plan', async () => {
    await prisma.billingTestAccount.create({
      data: {
        providerId,
        plan: 'BUSINESS',
        nextPlan: 'LITE',
        planExpiresAt: new Date(Date.now() - 1000),
        autoRenew: true,
        rebillId: '123',
      },
    });
    let state: Record<string, unknown> = {};
    call.mockImplementation(
      (method: string, input: Record<string, unknown>) => {
        if (method === 'Init') {
          state = {
            Success: true,
            ErrorCode: '0',
            TerminalKey: 'qaDEMO',
            Amount: input.Amount,
            OrderId: input.OrderId,
            PaymentId: '987654',
            Status: 'NEW',
            PaymentURL: 'https://pay.tbank.ru/test',
          };
          return state;
        }
        if (method === 'Charge') {
          state = { ...state, Status: 'CONFIRMED' };
          return state;
        }
        return state;
      },
    );
    const worker = new BillingRenewalService(prisma, service, {
      call,
    } as unknown as TbankClient);
    await Promise.all([worker.renew(providerId), worker.renew(providerId)]);
    expect(
      call.mock.calls.filter(([method]) => method === 'Charge'),
    ).toHaveLength(1);
    expect((await service.overview(userId, providerId)).plan).toBe('LITE');
    expect(
      (
        await prisma.billingTestOrder.findFirstOrThrow({
          where: { providerId },
        })
      ).amount,
    ).toBe(29900);
  });

  it('does not repeat Charge after a lost response', async () => {
    await prisma.billingTestAccount.create({
      data: {
        providerId,
        plan: 'LITE',
        planExpiresAt: new Date(Date.now() - 1000),
        autoRenew: true,
        rebillId: '123',
      },
    });
    let state: Record<string, unknown> = {};
    call.mockImplementation(
      (method: string, input: Record<string, unknown>) => {
        if (method === 'Init') {
          state = {
            Success: true,
            ErrorCode: '0',
            TerminalKey: 'qaDEMO',
            Amount: input.Amount,
            OrderId: input.OrderId,
            PaymentId: '987655',
            Status: 'NEW',
            PaymentURL: 'https://pay.tbank.ru/test',
          };
          return state;
        }
        if (method === 'Charge') {
          state = { ...state, Status: 'CONFIRMED' };
          throw new Error('lost');
        }
        return state;
      },
    );
    const worker = new BillingRenewalService(prisma, service, {
      call,
    } as unknown as TbankClient);
    await expect(worker.renew(providerId)).rejects.toThrow();
    await worker.tick();
    expect(
      call.mock.calls.filter(([method]) => method === 'Charge'),
    ).toHaveLength(1);
    expect((await service.overview(userId, providerId)).plan).toBe('LITE');
    expect((await service.overview(userId, providerId)).graceUntil).toBeNull();
  });
  it('retries failed renewal at 24 and 48 hours, then expires grace at 72 hours', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const start = new Date('2026-11-07T00:00:00Z');
      vi.setSystemTime(start);
      await prisma.billingTestAccount.create({
        data: {
          providerId,
          plan: 'BUSINESS',
          planExpiresAt: start,
          autoRenew: true,
          rebillId: '123',
        },
      });
      let state: Record<string, unknown> = {};
      let payment = 80000;
      call.mockImplementation(
        (method: string, input: Record<string, unknown>) => {
          if (method === 'Init')
            state = {
              Success: true,
              ErrorCode: '0',
              TerminalKey: 'qaDEMO',
              Amount: input.Amount,
              OrderId: input.OrderId,
              PaymentId: String(++payment),
              Status: 'NEW',
              PaymentURL: 'https://pay.tbank.ru/test',
            };
          if (method === 'Charge') state = { ...state, Status: 'REJECTED' };
          return state;
        },
      );
      const worker = new BillingRenewalService(prisma, service, {
        call,
      } as unknown as TbankClient);
      for (const hours of [0, 23, 24, 47, 48, 71]) {
        vi.setSystemTime(new Date(start.getTime() + hours * 3600000));
        await worker.renew(providerId);
        const count = await prisma.billingTestOrder.count({
          where: { providerId },
        });
        expect(count).toBe(hours < 24 ? 1 : hours < 48 ? 2 : 3);
        expect((await service.overview(userId, providerId)).plan).toBe(
          'BUSINESS',
        );
      }
      vi.setSystemTime(new Date(start.getTime() + 72 * 3600000));
      await worker.renew(providerId);
      const after = await service.overview(userId, providerId);
      expect(after.plan).toBe('STANDARD');
      expect(after.autoRenew).toBe(false);
      expect(after.notices.length).toBeGreaterThan(0);
      expect(
        call.mock.calls.filter(([method]) => method === 'Charge'),
      ).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not let a late paid order overwrite a newer tariff or mandate', async () => {
    const old = await service.checkout(
      userId,
      providerId,
      'LITE',
      randomUUID(),
      true,
    );
    await prisma.billingTestOrder.update({
      where: { id: old.id },
      data: { expiresAt: new Date(0) },
    });
    const current = await service.checkout(
      userId,
      providerId,
      'BUSINESS',
      randomUUID(),
      true,
    );
    await notification(current.id, 'CONFIRMED', { RebillId: '999' });
    await notification(old.id, 'CONFIRMED', { RebillId: '111' });
    const account = await prisma.billingTestAccount.findUniqueOrThrow({
      where: { providerId },
    });
    expect(account.plan).toBe('BUSINESS');
    expect(account.rebillId).toBe('999');
    expect(account.needsReview).toBe(true);
    await notification(old.id, 'AUTHORIZED', { RebillId: '111' });
    expect((await service.overview(userId, providerId)).autoRenew).toBe(false);
  });
  it('does not block an account when an unpaid authorization is reversed', async () => {
    const order = await service.checkout(
      userId,
      providerId,
      'LITE',
      randomUUID(),
    );
    await notification(order.id, 'AUTHORIZED');
    await notification(order.id, 'REVERSED');
    await notification(order.id);
    const overview = await service.overview(userId, providerId);
    expect(overview.plan).toBe('STANDARD');
    expect(overview.needsReview).toBe(false);
    expect(overview.orders[0].status).toBe('REVERSED');
    await expect(
      service.checkout(userId, providerId, 'LITE', randomUUID()),
    ).resolves.toMatchObject({ status: 'NEW' });
  });

  it('keeps Standard on the account while allowing tools during the pause', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
    try {
      const plans = new PlanService(prisma);
      const workspace = new WorkspaceService(prisma, plans);
      const template = {
        id: randomUUID(),
        title: 'Общий ответ',
        body: 'Здравствуйте',
        shared: true,
      };
      await workspace.template(userId, providerId, template);
      await workspace.task(userId, providerId, {
        id: randomUUID(),
        title: 'Ответить клиенту',
        note: 'Согласовать срок',
        assigneeUserId: userId,
        done: false,
      });
      const overview = await service.overview(userId, providerId);
      const tools = await workspace.read(userId, providerId);
      expect(overview.plan).toBe('STANDARD');
      expect(overview.entitlementPlan).toBe('BUSINESS');
      expect(overview.enforcementEnabled).toBe(false);
      expect(tools.templates).toHaveLength(1);
      expect(tools.tasks).toHaveLength(1);
      expect(tools.stats.byService).toBeDefined();
      expect(tools.stats.team).toBeDefined();
      vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
      await expect(
        workspace.template(userId, providerId, template),
      ).rejects.toThrow();
      expect((await service.overview(userId, providerId)).plan).toBe(
        'STANDARD',
      );
    } finally {
      vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    }
  });
});

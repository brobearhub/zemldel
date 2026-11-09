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
    vi.stubEnv('TBANK_ENABLED', '1');
    vi.stubEnv('TBANK_MODE', 'test');
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
    await prisma.billingOrder.deleteMany({
      where: { providerId: { in: providers } },
    });
    await prisma.billingAccount.deleteMany({
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
    const order = await prisma.billingOrder.findUniqueOrThrow({
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

  async function seedRenewalMandate() {
    return prisma.billingOrder.create({
      data: {
        providerId,
        operationId: randomUUID(),
        product: 'BUSINESS',
        amount: 900,
        terminalKey: 'qaDEMO',
        status: 'CONFIRMED',
        autoRenew: true,
        rebillId: '123',
        receiptEmail: 'original-buyer@example.test',
        expiresAt: new Date(),
      },
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
      const existingProvider = randomUUID();
      await client.query('INSERT INTO "Provider" (id) VALUES ($1)', [
        existingProvider,
      ]);
      await client.query(
        'INSERT INTO "BillingTestAccount" ("providerId", plan, "planExpiresAt", "autoRenew") VALUES ($1, $2, $3, true)',
        [existingProvider, 'LITE', new Date('2027-01-01T00:00:00Z')],
      );
      await client.query(
        readFileSync(
          'prisma/migrations/20261109210000_annual_billing/migration.sql',
          'utf8',
        ),
      );
      const oldOrderId = randomUUID();
      await client.query(
        'INSERT INTO "BillingTestOrder" (id, "providerId", "operationId", product, amount, "terminalKey", status, "fulfilledAt", "expiresAt", "updatedAt") VALUES ($1, $2, $3, $4, 700, $5, $6, $7, $8, $9)',
        [
          oldOrderId,
          existingProvider,
          randomUUID(),
          'LITE',
          'qaDEMO',
          'CONFIRMED',
          new Date('2026-12-01'),
          new Date('2026-12-01'),
          new Date('2026-12-01'),
        ],
      );
      // The rename script is transactional in deploy. This test already owns a transaction.
      const rename = readFileSync(
        'prisma/migrations/20261109220000_billing_names/migration.sql',
        'utf8',
      )
        .replace(/^BEGIN;$/m, '')
        .replace(/^COMMIT;$/m, '');
      await client.query(rename);
      await client.query(
        readFileSync(
          'prisma/migrations/20261110000000_billing_receipt/migration.sql',
          'utf8',
        ),
      );
      expect(
        (
          await client.query(
            'SELECT product, amount, status, "receiptEmail" FROM "BillingOrder" WHERE id = $1',
            [oldOrderId],
          )
        ).rows[0],
      ).toEqual({
        product: 'LITE',
        amount: 700,
        status: 'CONFIRMED',
        receiptEmail: null,
      });
      expect(
        (
          await client.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'billing_migration_qa' AND table_name ILIKE '%test%'`,
          )
        ).rows,
      ).toEqual([]);
      const migrated = await client.query(
        'SELECT "billingPeriod", "planExpiresAt", "autoRenew" FROM "BillingAccount" WHERE "providerId" = $1',
        [existingProvider],
      );
      expect(migrated.rows[0]).toEqual({
        billingPeriod: 'MONTH',
        planExpiresAt: new Date('2027-01-01T00:00:00Z'),
        autoRenew: true,
      });
      const result = await client.query<{ count: string }>(
        'SELECT count(*) FROM "BillingOrder"',
      );
      expect(result.rows[0].count).toBe('1');
    } finally {
      await client.query('ROLLBACK');
      await client.end();
    }
  });
  it('persists the authenticated buyer email and keeps it out of shared history', async () => {
    const order = await service.checkout(
      userId,
      providerId,
      'LITE',
      randomUUID(),
    );
    expect(call.mock.calls[0][0]).toBe('Init');
    expect(call.mock.calls[0][1]).toMatchObject({
      Amount: 700,
      Receipt: {
        Email: `${userId}@example.test`,
        Taxation: 'usn_income_outcome',
      },
    });
    expect(
      await prisma.billingOrder.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ receiptEmail: `${userId}@example.test` });
    await prisma.user.update({
      where: { id: userId },
      data: { email: `${userId}@changed.test` },
    });
    expect(
      await prisma.billingOrder.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ receiptEmail: `${userId}@example.test` });
    const overview = await service.overview(userId, providerId);
    expect(overview.orders[0]).not.toHaveProperty('receiptEmail');
  });

  it('rejects an invalid buyer email without reserving a pending payment', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { email: 'invalid' },
    });
    await expect(
      service.checkout(userId, providerId, 'LITE', randomUUID()),
    ).rejects.toThrow('email');
    expect(await prisma.billingOrder.count({ where: { providerId } })).toBe(0);
    expect(call).not.toHaveBeenCalled();
  });

  it.each([
    ['LITE_YEAR', 'LITE', 7560],
    ['BUSINESS_YEAR', 'BUSINESS', 9720],
  ] as const)(
    'activates %s for twelve calendar months and keeps cancellation after late notifications',
    async (product, plan, amount) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        vi.setSystemTime(new Date('2028-02-29T09:15:00Z'));
        const quote = await service.quote(userId, providerId, product);
        expect(quote).toMatchObject({ amount, mode: 'purchase' });
        const order = await service.checkout(
          userId,
          providerId,
          product,
          randomUUID(),
          true,
          quote.quoteAt,
          amount,
        );
        expect(call.mock.calls[0][1]).toMatchObject({
          Amount: amount,
          Recurrent: 'Y',
        });
        const before = await service.overview(userId, providerId);
        expect(before.renewalPending).toBe(true);
        await service.settings(userId, providerId, {
          autoRenew: false,
          nextPlan: 'STANDARD',
        });
        await notification(order.id, 'CONFIRMED', { RebillId: '123456789' });
        await notification(order.id, 'AUTHORIZED', { RebillId: '123456789' });
        const account = await service.overview(userId, providerId);
        expect(account).toMatchObject({
          plan,
          billingPeriod: 'YEAR',
          autoRenew: false,
          renewalPending: false,
          nextPlan: 'STANDARD',
        });
        expect(account.planExpiresAt?.toISOString()).toBe(
          '2029-02-28T09:15:00.000Z',
        );
        vi.setSystemTime(new Date('2029-02-28T09:15:01Z'));
        const worker = new BillingRenewalService(prisma, service, {
          call,
        } as unknown as TbankClient);
        await worker.renew(providerId);
        expect(
          call.mock.calls.filter(([method]) => method === 'Charge'),
        ).toHaveLength(0);
        expect((await service.overview(userId, providerId)).plan).toBe(
          'STANDARD',
        );
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('converts a paid month to a year using the server quote and schedules a shorter period', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-11-16T00:00:00Z'));
      await prisma.billingAccount.create({
        data: {
          providerId,
          plan: 'LITE',
          billingPeriod: 'MONTH',
          planStartedAt: new Date('2026-11-01'),
          planExpiresAt: new Date('2026-12-01'),
        },
      });
      const quote = await service.quote(userId, providerId, 'LITE_YEAR');
      expect(quote.amount).toBe(7210);
      await expect(
        service.checkout(
          userId,
          providerId,
          'LITE_YEAR',
          randomUUID(),
          false,
          quote.quoteAt,
          1,
        ),
      ).rejects.toThrow('Тариф изменился');
      const order = await service.checkout(
        userId,
        providerId,
        'LITE_YEAR',
        randomUUID(),
        true,
        quote.quoteAt,
        quote.amount,
      );
      await notification(order.id, 'CONFIRMED', { RebillId: '123' });
      const account = await service.overview(userId, providerId);
      expect(account).toMatchObject({
        plan: 'LITE',
        billingPeriod: 'YEAR',
        autoRenew: true,
      });
      expect(account.planExpiresAt?.toISOString()).toBe(
        '2027-11-16T00:00:00.000Z',
      );
      expect(await service.quote(userId, providerId, 'LITE')).toMatchObject({
        mode: 'schedule',
        amount: 700,
      });
      await expect(
        service.checkout(userId, providerId, 'LITE', randomUUID()),
      ).rejects.toThrow('Запланируйте');
      await service.settings(userId, providerId, {
        nextPlan: 'LITE',
        nextBillingPeriod: 'MONTH',
      });
      expect(await service.overview(userId, providerId)).toMatchObject({
        billingPeriod: 'YEAR',
        nextBillingPeriod: 'MONTH',
        planExpiresAt: account.planExpiresAt,
      });
      await service.settings(userId, providerId, {
        nextPlan: 'STANDARD',
        autoRenew: false,
      });
      expect(await service.overview(userId, providerId)).toMatchObject({
        autoRenew: false,
        nextBillingPeriod: null,
        planExpiresAt: account.planExpiresAt,
      });
    } finally {
      vi.useRealTimers();
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
    expect(orders[0].amount).toBe(700);
    await expect(
      service.checkout(userId, providerId, 'BUSINESS', operationId),
    ).rejects.toThrow();
  });
  it('does not sell reply packages on any plan', async () => {
    await expect(
      service.quote(userId, providerId, 'REPLIES_10'),
    ).rejects.toThrow('без ограничений');
    await expect(
      service.checkout(userId, providerId, 'REPLIES_10', randomUUID()),
    ).rejects.toThrow('без ограничений');
    expect(call).not.toHaveBeenCalled();
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
      'LITE',
      randomUUID(),
    );
    await notification(order.id, 'AUTHORIZED');
    expect((await service.overview(userId, providerId)).plan).toBe('STANDARD');
    await Promise.all(Array.from({ length: 8 }, () => notification(order.id)));
    await notification(order.id, 'AUTHORIZED');
    const overview = await service.overview(userId, providerId);
    expect(overview.plan).toBe('LITE');
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
      'LITE',
      randomUUID(),
    );
    await notification(order.id);
    await notification(order.id, 'PARTIAL_REFUNDED', { Amount: 500 });
    await notification(order.id);
    const overview = await service.overview(userId, providerId);
    expect(overview.plan).toBe('LITE');
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
            Amount: 900,
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
  it('keeps templates and tasks editable after downgrade', async () => {
    const plans = new PlanService(prisma),
      workspace = new WorkspaceService(prisma, plans);
    await prisma.billingAccount.create({
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
    await prisma.billingAccount.update({
      where: { providerId },
      data: { planExpiresAt: new Date(0) },
    });
    const read = await workspace.read(userId, providerId);
    expect(read.templates).toHaveLength(1);
    expect(read.tasks).toHaveLength(1);
    expect(read.limits.team).toBe(true);
    expect(read.stats.byService).toBeUndefined();
    await expect(
      workspace.template(userId, providerId, template),
    ).resolves.toBeDefined();
    await expect(
      workspace.task(userId, providerId, task),
    ).resolves.toBeDefined();
    await expect(workspace.read(randomUUID(), providerId)).rejects.toThrow();
  });

  it('uses the quoted prorated amount and saves mandate arriving after confirmation', async () => {
    const now = Date.now();
    await prisma.billingAccount.create({
      data: {
        providerId,
        plan: 'LITE',
        planStartedAt: new Date(now - 15 * 86400000),
        planExpiresAt: new Date(now + 15 * 86400000),
      },
    });
    const quote = await service.quote(userId, providerId, 'BUSINESS');
    expect(quote.amount).toBeGreaterThanOrEqual(550);
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

  it.each(['MONTH', 'YEAR'] as const)(
    'renews once across workers and honors a scheduled lower plan with %s billing',
    async (period) => {
      await seedRenewalMandate();
      await prisma.billingAccount.create({
        data: {
          providerId,
          plan: 'BUSINESS',
          nextPlan: 'LITE',
          nextBillingPeriod: period,
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
              PaymentId: period === 'YEAR' ? '987656' : '987654',
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
      expect(
        call.mock.calls.find(([method]) => method === 'Init')?.[1],
      ).toMatchObject({
        Receipt: {
          Email: 'original-buyer@example.test',
          Taxation: 'usn_income_outcome',
        },
      });
      expect((await service.overview(userId, providerId)).plan).toBe('LITE');
      expect(
        (
          await prisma.billingOrder.findFirstOrThrow({
            where: { providerId, renewalCycle: { not: null } },
          })
        ).amount,
      ).toBe(period === 'YEAR' ? 7560 : 700);
      expect((await service.overview(userId, providerId)).billingPeriod).toBe(
        period,
      );
    },
  );

  it('cancels an annual renewal before Charge when the owner refuses during Init', async () => {
    await seedRenewalMandate();
    await prisma.billingAccount.create({
      data: {
        providerId,
        plan: 'LITE',
        billingPeriod: 'YEAR',
        autoRenew: true,
        rebillId: '123',
        planExpiresAt: new Date(Date.now() - 1000),
      },
    });
    call.mockImplementation(
      async (method: string, input: Record<string, unknown>) => {
        if (method !== 'Init') throw new Error('Charge must not run');
        await service.settings(userId, providerId, {
          autoRenew: false,
          nextPlan: 'STANDARD',
        });
        return {
          Success: true,
          ErrorCode: '0',
          TerminalKey: 'qaDEMO',
          Amount: input.Amount,
          OrderId: input.OrderId,
          PaymentId: '987657',
          Status: 'NEW',
          PaymentURL: 'https://pay.tbank.ru/test',
        };
      },
    );
    const worker = new BillingRenewalService(prisma, service, {
      call,
    } as unknown as TbankClient);
    await worker.renew(providerId);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith('Init', expect.any(Object));
    expect(
      (
        await prisma.billingOrder.findFirstOrThrow({
          where: { providerId, renewalCycle: { not: null } },
        })
      ).status,
    ).toBe('CANCELED');
    expect((await service.overview(userId, providerId)).autoRenew).toBe(false);
  });

  it('does not repeat Charge after a lost response', async () => {
    await seedRenewalMandate();
    await prisma.billingAccount.create({
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
      await seedRenewalMandate();
      await prisma.billingAccount.create({
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
        const count = await prisma.billingOrder.count({
          where: { providerId, renewalCycle: { not: null } },
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
    await prisma.billingOrder.update({
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
    const account = await prisma.billingAccount.findUniqueOrThrow({
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
      ).resolves.toBeDefined();
      expect((await service.overview(userId, providerId)).plan).toBe(
        'STANDARD',
      );
    } finally {
      vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    }
  });
});

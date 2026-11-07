import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PlanService } from './plan.service';
import { BillingRenewalService } from './billing-renewal.service';

describe('temporary tariff pause', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('gives an unpaid Standard profile every tool without consuming replies', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
    const db = {
      billingTestAccount: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const plans = new PlanService(db);
    const access = await plans.access('provider');
    expect(access.plan).toBe('BUSINESS');
    expect(access.limits).toMatchObject({
      photos: 10,
      regions: null,
      replies: null,
      templates: true,
      sharedTemplates: true,
      team: true,
    });
    await expect(
      plans.validateService('provider', {
        stockBadge: 'Скидка',
        paletteColor: 'error',
        allRussia: true,
        regionCodes: ['01', '02', '03', '04'],
      }),
    ).resolves.toBe(access.limits);
    await expect(
      plans.consumeReply({} as never, 'user', 'conversation'),
    ).resolves.toBeUndefined();
  });

  it('does not charge an old conversation when enforcement resumes', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    const create = vi.fn().mockResolvedValue({});
    const tx = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          providerId: 'provider',
          requestId: 'request',
          customerUserId: 'customer',
          request: {
            serviceId: null,
            categoryId: null,
            customerUserId: 'customer',
          },
        }),
      },
      providerMember: {
        findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      replyDebit: { findUnique: vi.fn().mockResolvedValue(null), create },
      message: { findFirst: vi.fn().mockResolvedValue({ id: 'old-reply' }) },
      billingTestAccount: { upsert: vi.fn() },
    };
    const plans = new PlanService({} as PrismaService);
    await plans.consumeReply(tx as never, 'provider-user', 'conversation');
    expect(create).toHaveBeenCalledWith({
      data: { providerId: 'provider', requestId: 'request', source: 'LEGACY' },
    });
    expect(tx.billingTestAccount.upsert).not.toHaveBeenCalled();
  });

  it('does not start automatic charges during the pause', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_RENEWALS_ENABLED', '1');
    const findMany = vi.fn();
    const db = {
      billingTestAccount: { findMany },
    } as unknown as PrismaService;
    const worker = new BillingRenewalService(db, {} as never, {} as never);
    const tick = vi.spyOn(worker, 'tick');
    worker.onModuleInit();
    expect(tick).not.toHaveBeenCalled();
    await worker.tick();
    expect(findMany).not.toHaveBeenCalled();
    worker.onModuleDestroy();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PlanService } from './plan.service';
import { BillingRenewalService } from './billing-renewal.service';

describe('temporary tariff pause', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('gives an unpaid Standard profile every tool without consuming replies', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
    const db = {
      billingAccount: { findUnique: vi.fn().mockResolvedValue(null) },
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
  });

  it('keeps geography, templates and team available with enforcement enabled', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    const db = {
      billingAccount: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const plans = new PlanService(db);
    const access = await plans.access('provider');
    expect(access.limits).toMatchObject({
      regions: null,
      replies: null,
      templates: true,
      sharedTemplates: true,
      team: true,
    });
    await expect(
      plans.validateService('provider', {
        allRussia: true,
        regionCodes: ['01', '02', '03', '04'],
      }),
    ).resolves.toBe(access.limits);
    for (const feature of ['templates', 'sharedTemplates', 'team'] as const)
      await expect(
        plans.requireFeature('provider', feature),
      ).resolves.toBeUndefined();
  });

  it('does not start automatic charges during the pause', async () => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_RENEWALS_ENABLED', '1');
    const findMany = vi.fn();
    const db = {
      billingAccount: { findMany },
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

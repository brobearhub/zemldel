import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingRenewalService } from './billing-renewal.service';

describe('renewal worker activation', () => {
  beforeEach(() => {
    vi.stubEnv('TBANK_ENABLED', undefined);
    vi.stubEnv('TBANK_MODE', undefined);
    vi.stubEnv('TBANK_TERMINAL_KEY', 'qaDEMO');
    vi.stubEnv('TBANK_PASSWORD', 'test');
    vi.stubEnv('TBANK_SITE_URL', 'https://example.test');
    vi.stubEnv('TBANK_NOTIFICATION_URL', 'https://example.test/notify');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  it('runs by default for enabled DEMO billing, and stops on shutdown', () => {
    vi.useFakeTimers();
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_RENEWALS_ENABLED', undefined);
    const service = new BillingRenewalService(
      {} as never,
      {} as never,
      {} as never,
    );
    const tick = vi.spyOn(service, 'tick').mockResolvedValue();
    service.onModuleInit();
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60000);
    expect(tick).toHaveBeenCalledTimes(2);
    service.onModuleDestroy();
    vi.advanceTimersByTime(60000);
    expect(tick).toHaveBeenCalledTimes(2);
  });
  it.each([
    'PLAN_ENFORCEMENT_ENABLED',
    'TBANK_TEST_ENABLED',
    'TBANK_RENEWALS_ENABLED',
  ])('honors the %s off switch', (flag) => {
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_RENEWALS_ENABLED', '1');
    vi.stubEnv(flag, '0');
    const service = new BillingRenewalService(
      {} as never,
      {} as never,
      {} as never,
    );
    const tick = vi.spyOn(service, 'tick').mockResolvedValue();
    service.onModuleInit();
    expect(tick).not.toHaveBeenCalled();
  });
  it('starts for an explicitly enabled live terminal', () => {
    vi.useFakeTimers();
    vi.stubEnv('TBANK_ENABLED', '1');
    vi.stubEnv('TBANK_MODE', 'live');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'qa-live');
    const service = new BillingRenewalService(
      {} as never,
      {} as never,
      {} as never,
    );
    const tick = vi.spyOn(service, 'tick').mockResolvedValue();
    service.onModuleInit();
    expect(tick).toHaveBeenCalledOnce();
    service.onModuleDestroy();
  });

  it('does not initialize or charge a mandate from another terminal', async () => {
    vi.stubEnv('TBANK_ENABLED', '1');
    vi.stubEnv('TBANK_MODE', 'live');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'qa-live');
    const tx = {
      billingAccount: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          autoRenew: true,
          rebillId: '123',
          planExpiresAt: new Date(0),
          needsReview: false,
        }),
      },
      billingOrder: { create: vi.fn() },
    };
    const billing = {
      lock: vi.fn(),
      hasRenewalMandate: vi.fn().mockResolvedValue(false),
      initialize: vi.fn(),
    };
    const bank = { call: vi.fn() };
    const service = new BillingRenewalService(
      { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as never,
      billing as never,
      bank as never,
    );
    await service.renew('provider');
    expect(billing.hasRenewalMandate).toHaveBeenCalledWith(
      'provider',
      '123',
      'qa-live',
      tx,
    );
    expect(tx.billingOrder.create).not.toHaveBeenCalled();
    expect(billing.initialize).not.toHaveBeenCalled();
    expect(bank.call).not.toHaveBeenCalled();
  });
});

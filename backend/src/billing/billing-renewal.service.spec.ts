import { afterEach, describe, expect, it, vi } from 'vitest';
import { BillingRenewalService } from './billing-renewal.service';

describe('renewal worker activation', () => {
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
});

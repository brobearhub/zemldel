import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingService } from './billing.service';

describe('live billing configuration', () => {
  beforeEach(() => {
    vi.stubEnv('TBANK_ENABLED', '1');
    vi.stubEnv('TBANK_MODE', 'live');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'working-terminal');
    vi.stubEnv('TBANK_PASSWORD', 'test-password');
    vi.stubEnv('TBANK_SITE_URL', 'https://example.test');
    vi.stubEnv('TBANK_NOTIFICATION_URL', 'https://example.test/notify');
  });
  afterEach(() => vi.unstubAllEnvs());

  function setup() {
    const db = {
      providerMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ status: 'ACTIVE', role: 'OWNER' }),
      },
      billingAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      billingOrder: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      billingNotice: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const bank = { call: vi.fn() };
    return {
      db,
      bank,
      service: new BillingService(db as never, bank as never),
    };
  }

  it('enables purchases for a configured live terminal', async () => {
    const { service } = setup();
    expect(await service.overview('user', 'provider')).toMatchObject({
      mode: 'live',
      enabled: true,
      canPay: true,
      configurationError: null,
    });
  });

  it('returns a useful configuration error without credentials', async () => {
    vi.stubEnv('TBANK_PASSWORD', '');
    const { service } = setup();
    const result = await service.overview('user', 'provider');
    expect(result.enabled).toBe(false);
    expect(result.configurationError).toContain('TBANK_PASSWORD');
    expect(JSON.stringify(result)).not.toContain('working-terminal');
  });

  it('looks for a confirmed mandate on the active terminal', async () => {
    const { service, db } = setup();
    expect(
      await service.getRenewalMandate('provider', '123', 'working-terminal'),
    ).toBeNull();
    expect(db.billingOrder.findFirst).toHaveBeenCalledWith({
      where: {
        providerId: 'provider',
        rebillId: '123',
        terminalKey: 'working-terminal',
        autoRenew: true,
        status: 'CONFIRMED',
        receiptEmail: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, receiptEmail: true },
    });
  });

  it('never initializes an old DEMO order using live credentials', async () => {
    const { service, bank } = setup();
    await expect(
      service.initialize({ terminalKey: 'oldDEMO' } as never),
    ).rejects.toThrow('другого терминала');
    expect(bank.call).not.toHaveBeenCalled();
  });
});

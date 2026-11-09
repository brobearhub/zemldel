import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  bankRedirectDueDate,
  bankToken,
  billingConfig,
  safePaymentUrl,
  TbankClient,
  verifyBankToken,
} from './tbank';
import { addCalendarMonth } from './billing-catalog';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('T-Bank protocol', () => {
  it('formats payment deadlines with seconds and an explicit UTC offset', () => {
    expect(bankRedirectDueDate(new Date('2026-11-09T19:30:00.419+05:00'))).toBe(
      '2026-11-09T14:30:00+00:00',
    );
    expect(bankRedirectDueDate(new Date('2026-12-01T00:10:00.000+05:00'))).toBe(
      '2026-11-30T19:10:00+00:00',
    );
  });
  it('sorts scalars, includes booleans and excludes nested data and Token', () => {
    const data = {
      TerminalKey: 'demoDEMO',
      Success: true,
      Amount: 29900,
      Token: 'ignored',
      Receipt: { Amount: 1 },
      DATA: ['ignored'],
      Empty: null,
    };
    const expected = createHash('sha256')
      .update('29900secrettruedemoDEMO')
      .digest('hex');
    expect(bankToken(data, 'secret')).toBe(expected);
    expect(verifyBankToken({ ...data, Token: expected }, 'secret')).toBe(true);
    expect(
      verifyBankToken({ ...data, Amount: 1, Token: expected }, 'secret'),
    ).toBe(false);
    expect(verifyBankToken({ Token: '00' }, 'secret')).toBe(false);
    expect(bankToken({ ...data, Password: 'attacker' }, 'secret')).toBe(
      expected,
    );
  });
  it('blocks live terminals and disabled integration', () => {
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'live');
    vi.stubEnv('TBANK_PASSWORD', 'test');
    expect(() => billingConfig()).toThrow();
    vi.stubEnv('TBANK_TERMINAL_KEY', 'testDEMO');
    vi.stubEnv('TBANK_TEST_ENABLED', '0');
    expect(() => billingConfig()).toThrow();
  });
  it('rejects unsafe redirect targets', () => {
    expect(safePaymentUrl('https://pay.tbank.ru/new/123')).toContain(
      'pay.tbank.ru',
    );
    expect(safePaymentUrl('https://pay.tbank-online.com/new/123')).toBe(
      'https://pay.tbank-online.com/new/123',
    );
    for (const value of [
      'javascript:alert(1)',
      'https://pay.tbank.ru.evil.test',
      'https://pay.tbank-online.com.evil.test',
      'https://user@pay.tbank-online.com/new/123',
      'https://user@pay.tbank.ru',
      'http://pay.tbank.ru',
    ])
      expect(() => safePaymentUrl(value)).toThrow();
  });
  it('signs requests and never transmits the password', async () => {
    vi.stubEnv('TBANK_TEST_ENABLED', '1');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'testDEMO');
    vi.stubEnv('TBANK_PASSWORD', 'secret');
    vi.stubEnv('TBANK_SITE_URL', 'https://example.test');
    vi.stubEnv('TBANK_NOTIFICATION_URL', 'https://example.test/notify');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ Success: true })));
    vi.stubGlobal('fetch', fetchMock);
    await new TbankClient().call('GetState', { PaymentId: '123' });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://securepay.tinkoff.ru/v2/GetState');
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.Password).toBeUndefined();
    expect(body.Token).toBe(bankToken(body, 'secret'));
  });
  it('clamps calendar months at month-end while preserving the time', () => {
    expect(
      addCalendarMonth(new Date('2027-01-31T09:00:00Z')).toISOString(),
    ).toBe('2027-02-28T09:00:00.000Z');
    expect(
      addCalendarMonth(new Date('2028-01-31T09:00:00Z')).toISOString(),
    ).toBe('2028-02-29T09:00:00.000Z');
  });
});

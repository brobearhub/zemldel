import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingService } from './billing.service';
import { billingReceipt, receiptEmail } from './billing-receipt';
import { BILLING_PRODUCTS } from './billing-catalog';
import { bankToken, TbankClient } from './tbank';

describe('fiscal receipt', () => {
  beforeEach(() => {
    vi.stubEnv('TBANK_ENABLED', '1');
    vi.stubEnv('TBANK_MODE', 'live');
    vi.stubEnv('TBANK_TERMINAL_KEY', 'receipt-terminal');
    vi.stubEnv('TBANK_PASSWORD', 'test-password');
    vi.stubEnv('TBANK_SITE_URL', 'https://example.test');
    vi.stubEnv('TBANK_NOTIFICATION_URL', 'https://example.test/notify');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    ['LITE', 700, null],
    ['BUSINESS_YEAR', 9720, null],
    ['BUSINESS', 201, null],
    ['BUSINESS', 900, new Date('2026-11-10T00:00:00Z')],
  ] as const)(
    'sends a signed Init with the actual %s charge of %i kopecks',
    async (product, amount, renewalCycle) => {
      const order = {
        id: 'order',
        providerId: 'provider',
        terminalKey: 'receipt-terminal',
        receiptEmail: 'buyer@example.test',
        product,
        amount,
        autoRenew: Boolean(renewalCycle),
        renewalCycle,
        expiresAt: new Date(Date.now() + 1800000),
        status: 'INITIALIZING',
        paymentId: null,
      };
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Success: true,
            TerminalKey: order.terminalKey,
            OrderId: order.id,
            Amount: amount,
            PaymentId: '123',
            PaymentURL: 'https://pay.tbank.ru/payment',
          }),
        ),
      );
      vi.stubGlobal('fetch', fetchMock);
      const tx = {
        $queryRaw: vi.fn(),
        billingOrder: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(order),
          update: vi
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ ...order, ...data }),
            ),
        },
      };
      const service = new BillingService(
        {
          $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
        } as never,
        new TbankClient(),
      );
      await service.initialize(order as never);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://securepay.tinkoff.ru/v2/Init');
      const body = JSON.parse(options.body as string) as Record<
        string,
        unknown
      > & {
        Receipt: ReturnType<typeof billingReceipt> & { FfdVersion?: string };
        DATA: { OperationInitiatorType: string };
      };
      expect(body.Receipt).toEqual({
        Email: order.receiptEmail,
        Taxation: 'usn_income_outcome',
        Items: [
          {
            Name: BILLING_PRODUCTS[product].title,
            Price: amount,
            Quantity: 1,
            Amount: amount,
            PaymentMethod: 'full_payment',
            PaymentObject: 'service',
            Tax: 'none',
          },
        ],
      });
      expect(body.Amount).toBe(amount);
      expect(body.DATA.OperationInitiatorType).toBe(renewalCycle ? 'R' : '0');
      expect(body.Receipt.FfdVersion).toBeUndefined();
      const { Receipt: receipt, ...scalars } = body;
      expect(receipt).toBeDefined();
      expect(body.Token).toBe(bankToken(scalars, 'test-password'));
      expect(body.Password).toBeUndefined();
    },
  );

  it.each([null, '', 'not-an-email', `${'x'.repeat(60)}@example.test`])(
    'rejects invalid receipt contact %s before Init',
    async (email) => {
      const bank = { call: vi.fn() };
      const service = new BillingService({} as never, bank as never);
      await expect(
        service.initialize({
          terminalKey: 'receipt-terminal',
          product: 'LITE',
          receiptEmail: email,
          amount: 700,
        } as never),
      ).rejects.toThrow('email');
      expect(bank.call).not.toHaveBeenCalled();
    },
  );

  it('trims email and rejects fractional kopecks or nonpositive totals', () => {
    expect(receiptEmail(' buyer@example.test ')).toBe('buyer@example.test');
    for (const amount of [0, -1, 1.5, NaN]) {
      expect(() =>
        billingReceipt('buyer@example.test', 'Тариф', amount),
      ).toThrow('сумма');
    }
  });
});

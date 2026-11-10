import { LegalDocsService } from '../legal-docs/legal-docs.service';
import { describe, expect, it, vi } from 'vitest';
import { BillingService } from './billing.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TbankClient } from './tbank';

function setup(fulfilledAt: Date | null = null) {
  const order = {
    id: '43149aef-d691-4585-b61f-74a157574197',
    providerId: 'f48e17db-ac38-402c-a384-40f5ba7d1dc8',
    terminalKey: 'testDEMO',
    paymentId: '123',
    amount: 29900,
    status: fulfilledAt ? 'CONFIRMED' : 'NEW',
    autoRenew: false,
    fulfilledAt,
  };
  const update = vi.fn().mockResolvedValue(order);
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    billingOrder: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(order),
      update,
    },
  };
  const prisma = {
    billingOrder: { findUnique: vi.fn().mockResolvedValue(order) },
    $transaction: vi.fn((callback: (value: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
  } as unknown as PrismaService;
  const service = new BillingService(
    prisma,
    {} as TbankClient,
    new LegalDocsService(),
  );
  const payload = {
    TerminalKey: order.terminalKey,
    OrderId: order.id,
    PaymentId: order.paymentId,
    Success: true,
    ErrorCode: '0',
    Status: 'CANCELED',
    Amount: 0,
  };
  return { service, payload, update };
}

describe('T-Bank canceled payment reconciliation', () => {
  it('records an unpaid cancellation with zero current amount', async () => {
    const { service, payload, update } = setup();
    await service.applyState(payload, true);
    expect(update).toHaveBeenCalledWith({
      where: { id: payload.OrderId },
      data: { paymentId: '123', status: 'CANCELED' },
    });
  });

  it.each([
    { Amount: 100 },
    { Status: 'CONFIRMED' },
    { TerminalKey: 'otherDEMO' },
    { PaymentId: '456' },
  ])('still rejects mismatched payment data: %j', async (changes) => {
    const { service, payload, update } = setup();
    await expect(
      service.applyState({ ...payload, ...changes }, true),
    ).rejects.toThrow('Данные платежа не совпадают с заказом');
    expect(update).not.toHaveBeenCalled();
  });

  it('does not treat an already fulfilled payment as an unpaid cancellation', async () => {
    const { service, payload, update } = setup(new Date());
    await expect(service.applyState(payload, true)).rejects.toThrow(
      'Данные платежа не совпадают с заказом',
    );
    expect(update).not.toHaveBeenCalled();
  });
});

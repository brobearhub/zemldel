import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestPaymentsService } from './request-payments.service';

const NOW = new Date('2026-08-13T00:00:00.000Z');
const PROVIDER_ID = '11111111-1111-1111-1111-111111111111';

function makeService(prisma: object) {
  return new RequestPaymentsService(prisma as never, {
    getServiceManagementContext: vi.fn().mockResolvedValue({
      isPlatformAdmin: false,
      providerId: PROVIDER_ID,
    }),
  } as never);
}

describe('RequestPaymentsService', () => {
  it('setTotalForProvider rejects other provider', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'other',
          lockedAt: NOW,
          totalAmountRubles: null,
          payments: [],
        }),
      },
    };
    await expect(
      makeService(prisma).setTotalForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        totalAmountRubles: 25000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addPaymentForProvider rejects after COMPLETED', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'COMPLETED',
          providerId: PROVIDER_ID,
          lockedAt: NOW,
          totalAmountRubles: 25000,
          payments: [],
        }),
      },
    };
    await expect(
      makeService(prisma).addPaymentForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        amountRubles: 5000,
        comment: 'Аванс',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getForCustomer hides finance before lock', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          lockedAt: null,
          totalAmountRubles: 25000,
          payments: [{ id: 'p1', type: 'CONTRACT', amountRubles: 5000, comment: 'Аванс', paidAt: NOW, createdAt: NOW }],
        }),
      },
    };
    const dto = await makeService(prisma).getForCustomer({ actorUserId: 'u1', requestId: 'r1' });
    expect(dto).toEqual({
      totalAmountRubles: null,
      paidAmountRubles: 0,
      remainingAmountRubles: null,
      payments: [],
    });
  });

  it('addPaymentForProvider creates CONTRACT payment as scheduled (paidAt=null)', async () => {
    const tx = {
      requestPayment: { create: vi.fn().mockResolvedValue(null) },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
      request: {
        findFirstOrThrow: vi.fn().mockResolvedValue({
          totalAmountRubles: 25000,
          payments: [],
        }),
      },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTED',
          providerId: PROVIDER_ID,
          lockedAt: NOW,
          totalAmountRubles: 25000,
          payments: [],
        }),
      },
      $transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
    };

    await makeService(prisma).addPaymentForProvider({
      actorUserId: 'u1',
      requestId: 'r1',
      amountRubles: 5000,
      comment: 'Аванс',
      type: 'CONTRACT',
    });

    expect(tx.requestPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: 'r1',
          providerId: PROVIDER_ID,
          type: 'CONTRACT',
          amountRubles: 5000,
          paidAt: null,
          createdByUserId: 'u1',
        }),
      }),
    );
  });

  it('addPaymentForProvider creates OTHER payment as scheduled (paidAt=null)', async () => {
    const tx = {
      requestPayment: { create: vi.fn().mockResolvedValue(null) },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
      request: {
        findFirstOrThrow: vi.fn().mockResolvedValue({
          totalAmountRubles: 25000,
          payments: [],
        }),
      },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTED',
          providerId: PROVIDER_ID,
          lockedAt: NOW,
          totalAmountRubles: 25000,
          payments: [],
        }),
      },
      $transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
    };

    await makeService(prisma).addPaymentForProvider({
      actorUserId: 'u1',
      requestId: 'r1',
      amountRubles: 5000,
      comment: 'Кадастровый инженер',
      type: 'OTHER',
    });

    expect(tx.requestPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: 'r1',
          providerId: PROVIDER_ID,
          type: 'OTHER',
          amountRubles: 5000,
          paidAt: null,
          createdByUserId: 'u1',
        }),
      }),
    );
  });

  it('markPaymentPaidForCustomer sets paidAt for scheduled CONTRACT payment', async () => {
    const payment = { id: 'p1', type: 'CONTRACT' as const, amountRubles: 5000, comment: 'Аванс', paidAt: null, createdAt: NOW };
    const tx = {
      requestPayment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
      request: {
        findFirstOrThrow: vi.fn().mockResolvedValue({
          totalAmountRubles: 25000,
          payments: [{ ...payment, paidAt: NOW }],
        }),
      },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACCEPTED',
          providerId: PROVIDER_ID,
          lockedAt: NOW,
          totalAmountRubles: 25000,
          payments: [payment],
        }),
      },
      $transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
    };

    await makeService(prisma).markPaymentPaidForCustomer({
      actorUserId: 'u1',
      requestId: 'r1',
      paymentId: 'p1',
    });

    expect(tx.requestPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1', requestId: 'r1', paidAt: null },
      }),
    );
    expect(tx.requestEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: 'r1',
          type: 'PAYMENT_MARKED_PAID',
          actorUserId: 'u1',
          actorProviderId: PROVIDER_ID,
        }),
      }),
    );
  });
});

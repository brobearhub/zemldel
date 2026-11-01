import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestPaymentsService } from './request-payments.service';

const NOW = new Date('2026-08-13T00:00:00.000Z');
const PROVIDER_ID = '11111111-1111-1111-1111-111111111111';

function makeService(prisma: object, providerId = PROVIDER_ID) {
  return new RequestPaymentsService(
    prisma as never,
    {
      getServiceManagementContext: vi.fn().mockResolvedValue({
        isPlatformAdmin: false,
        providerId,
      }),
    } as never,
  );
}

describe('RequestPaymentsService', () => {
  it('opposite side accepts a provider proposal and atomically sets total', async () => {
    const proposal = {
      id: 'pp1',
      requestId: 'r1',
      providerId: PROVIDER_ID,
      amountRubles: 12000,
      authorSide: 'PROVIDER',
      proposedByUserId: 'provider-user',
      acceptedAt: null,
      acceptedByUserId: null,
      supersededAt: null,
      createdAt: NOW,
    };
    const tx = {
      requestPriceProposal: {
        findFirst: vi.fn().mockResolvedValue(proposal),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({
          totalAmountRubles: 12000,
          payments: [],
          priceProposals: [
            { ...proposal, acceptedAt: NOW, acceptedByUserId: 'customer' },
          ],
        }),
      },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          totalAmountRubles: null,
          payments: [],
          priceProposals: [proposal],
        }),
      },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };

    const dto = await makeService(prisma).acceptPriceForCustomer({
      actorUserId: 'customer',
      requestId: 'r1',
      proposalId: 'pp1',
    });

    expect(tx.requestPriceProposal.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pp1',
        requestId: 'r1',
        providerId: PROVIDER_ID,
        acceptedAt: null,
        supersededAt: null,
      },
      data: { acceptedAt: expect.any(Date), acceptedByUserId: 'customer' },
    });
    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalAmountRubles: 12000 } }),
    );
    expect(dto.totalAmountRubles).toBe(12000);
  });

  it('proposal author side cannot accept its own proposal', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          totalAmountRubles: null,
          payments: [],
          priceProposals: [
            {
              id: 'pp1',
              providerId: PROVIDER_ID,
              amountRubles: 12000,
              authorSide: 'CUSTOMER',
              acceptedAt: null,
              supersededAt: null,
            },
          ],
        }),
      },
    };

    await expect(
      makeService(prisma).acceptPriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        proposalId: 'pp1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stale proposal cannot be accepted', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          totalAmountRubles: null,
          payments: [],
          priceProposals: [
            {
              id: 'pp1',
              providerId: PROVIDER_ID,
              amountRubles: 12000,
              authorSide: 'PROVIDER',
              acceptedAt: null,
              supersededAt: NOW,
            },
          ],
        }),
      },
    };

    await expect(
      makeService(prisma).acceptPriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        proposalId: 'pp1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('new proposal supersedes current proposal and clears agreed total', async () => {
    const tx = {
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({
          id: 'pp2',
          providerId: PROVIDER_ID,
          amountRubles: 15000,
          authorSide: 'CUSTOMER',
          proposedByUserId: 'customer',
          acceptedAt: null,
          acceptedByUserId: null,
          supersededAt: null,
          createdAt: NOW,
        }),
      },
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({
          totalAmountRubles: null,
          payments: [],
          priceProposals: [
            {
              id: 'pp2',
              providerId: PROVIDER_ID,
              amountRubles: 15000,
              authorSide: 'CUSTOMER',
              proposedByUserId: 'customer',
              acceptedAt: null,
              acceptedByUserId: null,
              supersededAt: null,
              createdAt: NOW,
            },
          ],
        }),
      },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          totalAmountRubles: 12000,
          payments: [],
          priceProposals: [{ id: 'pp1', providerId: PROVIDER_ID }],
        }),
      },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };

    const dto = await makeService(prisma).proposePriceForCustomer({
      actorUserId: 'customer',
      requestId: 'r1',
      amountRubles: 15000,
    });

    expect(tx.requestPriceProposal.updateMany).toHaveBeenCalledWith({
      where: { requestId: 'r1', providerId: PROVIDER_ID, supersededAt: null },
      data: { supersededAt: expect.any(Date) },
    });
    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalAmountRubles: null } }),
    );
    expect(dto.totalAmountRubles).toBeNull();
  });

  it('proposal is rejected after contract acceptance', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          contractAcceptedAt: NOW,
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          totalAmountRubles: 12000,
          payments: [],
          priceProposals: [],
        }),
      },
    };

    await expect(
      makeService(prisma).proposePriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        amountRubles: 15000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not change price when contract is accepted after preload but before mutation transaction', async () => {
    const state = {
      status: 'DISCUSSING',
      contractAcceptedAt: null as Date | null,
      totalAmountRubles: 12000,
      proposals: [
        {
          id: 'pp1',
          providerId: PROVIDER_ID,
          amountRubles: 12000,
          authorSide: 'PROVIDER' as const,
          proposedByUserId: 'provider-user',
          acceptedAt: NOW,
          acceptedByUserId: 'customer',
          supersededAt: null as Date | null,
          createdAt: NOW,
        },
      ],
    };
    const tx = {
      request: {
        updateMany: vi.fn().mockImplementation(() => ({
          count: state.contractAcceptedAt == null ? 1 : 0,
        })),
        update: vi.fn().mockImplementation(() => {
          state.totalAmountRubles = 0;
          return { totalAmountRubles: null, payments: [] };
        }),
      },
      requestPriceProposal: {
        updateMany: vi.fn().mockImplementation(() => {
          state.proposals[0].supersededAt = NOW;
          return { count: 1 };
        }),
        create: vi.fn().mockImplementation(() => {
          const proposal: (typeof state.proposals)[number] = {
            ...state.proposals[0],
            id: 'pp2',
            amountRubles: 15000,
            authorSide: 'CUSTOMER',
            acceptedAt: null,
            acceptedByUserId: null,
            supersededAt: null,
          };
          state.proposals.push(proposal);
          return proposal;
        }),
      },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockImplementation(() => ({
          id: 'r1',
          status: state.status,
          contractAcceptedAt: state.contractAcceptedAt,
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          totalAmountRubles: state.totalAmountRubles,
          payments: [],
          priceProposals: state.proposals.map((proposal) => ({ ...proposal })),
        })),
      },
      $transaction: vi.fn(
        async (fn: (client: typeof tx) => Promise<unknown>) => {
          state.status = 'ACTIVE';
          state.contractAcceptedAt = NOW;
          return fn(tx);
        },
      ),
    };

    await expect(
      makeService(prisma).proposePriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        amountRubles: 15000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(state.totalAmountRubles).toBe(12000);
    expect(state.proposals).toHaveLength(1);
    expect(state.proposals[0]?.supersededAt).toBeNull();
  });

  it('proposePriceForProvider rejects other provider', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'other',
          lockedAt: NOW,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          priceProposals: [],
          payments: [],
        }),
      },
    };
    await expect(
      makeService(prisma).proposePriceForProvider({
        actorUserId: 'u1',
        requestId: 'r1',
        amountRubles: 25000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addPaymentForProvider rejects after CANCELLED', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'CANCELLED',
          providerId: PROVIDER_ID,
          lockedAt: NOW,
          totalAmountRubles: 25000,
          contractAcceptedAt: null,
          priceProposals: [],
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

  it('getForCustomer returns finance before lock', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          customerUserId: 'u1',
          status: 'ACTIVE',
          contractAcceptedAt: NOW,
          totalAmountRubles: 25000,
          priceProposals: [],
          payments: [
            {
              id: 'p1',
              type: 'CONTRACT',
              amountRubles: 5000,
              comment: 'Аванс',
              paidAt: NOW,
              createdAt: NOW,
              createdByUserId: null,
            },
          ],
        }),
      },
    };
    const dto = await makeService(prisma).getForCustomer({
      actorUserId: 'u1',
      requestId: 'r1',
    });
    expect(dto.totalAmountRubles).toBe(25000);
    expect(dto.paidAmountRubles).toBe(5000);
    expect(dto.payments[0]?.createdBySide).toBeNull();
  });

  it('proposePriceForCustomer rejects a stranger with 403', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'NEW',
          providerId: PROVIDER_ID,
          customerUserId: 'owner',
          contractAcceptedAt: null,
          totalAmountRubles: null,
          priceProposals: [],
          payments: [],
        }),
      },
    };
    await expect(
      makeService(prisma).proposePriceForCustomer({
        actorUserId: 'stranger',
        requestId: 'r1',
        amountRubles: 15000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('proposePriceForProvider creates an active proposal without agreeing total', async () => {
    const proposal = {
      id: 'pp1',
      providerId: PROVIDER_ID,
      amountRubles: 15000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'u1',
      acceptedAt: null,
      acceptedByUserId: null,
      supersededAt: null,
      createdAt: NOW,
    };
    const tx = {
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue(proposal),
      },
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({
          totalAmountRubles: null,
          payments: [],
        }),
      },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'NEW',
          serviceId: 'svc',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
        }),
      },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const dto = await makeService(prisma).proposePriceForProvider({
      actorUserId: 'u1',
      requestId: 'r1',
      amountRubles: 15000,
    });
    expect(dto.totalAmountRubles).toBeNull();
    expect(dto.priceProposal?.amountRubles).toBe(15000);
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
      $transaction: vi.fn((fn: (tx: typeof tx) => unknown) => fn(tx)),
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
      $transaction: vi.fn((fn: (tx: typeof tx) => unknown) => fn(tx)),
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
    const payment = {
      id: 'p1',
      type: 'CONTRACT' as const,
      amountRubles: 5000,
      comment: 'Аванс',
      paidAt: null,
      createdAt: NOW,
    };
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
      $transaction: vi.fn((fn: (tx: typeof tx) => unknown) => fn(tx)),
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

  it.each([
    { side: 'provider' as const, actorUserId: 'provider-user' },
    { side: 'customer' as const, actorUserId: 'customer' },
  ])(
    '$side can add CONTRACT payment after COMPLETED',
    async ({ side, actorUserId }) => {
      const payment = {
        id: 'p2',
        type: 'CONTRACT' as const,
        amountRubles: 5000,
        comment: 'Финальный платёж',
        paidAt: null,
        createdAt: NOW,
        createdByUserId: actorUserId,
      };
      const tx = {
        requestPayment: { create: vi.fn().mockResolvedValue(payment) },
        requestEvent: { create: vi.fn().mockResolvedValue(null) },
        request: {
          findFirstOrThrow: vi.fn().mockResolvedValue({
            totalAmountRubles: 25000,
            payments: [payment],
          }),
        },
      };
      const request = {
        id: 'r1',
        status: 'COMPLETED',
        providerId: PROVIDER_ID,
        customerUserId: 'customer',
        lockedAt: NOW,
        contractAcceptedAt: NOW,
        totalAmountRubles: 25000,
        priceProposals: [],
        payments: [],
      };
      const prisma = {
        request: { findFirst: vi.fn().mockResolvedValue(request) },
        $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      };
      const service = makeService(prisma);

      const dto =
        side === 'provider'
          ? await service.addPaymentForProvider({
              actorUserId,
              requestId: 'r1',
              amountRubles: 5000,
              comment: 'Финальный платёж',
              type: 'CONTRACT',
            })
          : await service.addPaymentForCustomer({
              actorUserId,
              requestId: 'r1',
              amountRubles: 5000,
              comment: 'Финальный платёж',
              type: 'CONTRACT',
            });

      expect(tx.requestPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: 'r1',
            providerId: PROVIDER_ID,
            createdByUserId: actorUserId,
            paidAt: null,
          }),
        }),
      );
      expect(dto.remainingAmountRubles).toBe(25000);
    },
  );

  it.each([
    { side: 'provider' as const, actorUserId: 'provider-user' },
    { side: 'customer' as const, actorUserId: 'customer' },
  ])(
    '$side can mark CONTRACT payment paid after COMPLETED without changing request status',
    async ({ side, actorUserId }) => {
      const payment = {
        id: 'p1',
        type: 'CONTRACT' as const,
        amountRubles: 5000,
        comment: 'Финальный платёж',
        paidAt: null,
        createdAt: NOW,
        createdByUserId: 'provider-user',
      };
      const paidPayment = { ...payment, paidAt: NOW };
      const tx = {
        requestPayment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        requestEvent: { create: vi.fn().mockResolvedValue(null) },
        request: {
          findFirstOrThrow: vi.fn().mockResolvedValue({
            totalAmountRubles: 25000,
            payments: [paidPayment],
          }),
          update: vi.fn(),
        },
      };
      const request = {
        id: 'r1',
        status: 'COMPLETED',
        providerId: PROVIDER_ID,
        customerUserId: 'customer',
        lockedAt: NOW,
        contractAcceptedAt: NOW,
        totalAmountRubles: 25000,
        priceProposals: [],
        payments: [payment],
      };
      const prisma = {
        request: { findFirst: vi.fn().mockResolvedValue(request) },
        $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
      };
      const service = makeService(prisma);

      const dto =
        side === 'provider'
          ? await service.markPaymentPaidForProvider({
              actorUserId,
              requestId: 'r1',
              paymentId: 'p1',
            })
          : await service.markPaymentPaidForCustomer({
              actorUserId,
              requestId: 'r1',
              paymentId: 'p1',
            });

      expect(dto.paidAmountRubles).toBe(5000);
      expect(dto.remainingAmountRubles).toBe(20000);
      expect(tx.request.update).not.toHaveBeenCalled();
    },
  );

  it.each(['CANCELLED', 'CLOSED'])(
    '%s rejects adding and marking payments',
    async (status) => {
      const payment = {
        id: 'p1',
        type: 'CONTRACT' as const,
        amountRubles: 5000,
        comment: 'Аванс',
        paidAt: null,
        createdAt: NOW,
        createdByUserId: 'provider-user',
      };
      const prisma = {
        request: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'r1',
            status,
            providerId: PROVIDER_ID,
            customerUserId: 'customer',
            lockedAt: NOW,
            contractAcceptedAt: NOW,
            totalAmountRubles: 25000,
            priceProposals: [],
            payments: [payment],
          }),
        },
      };
      const service = makeService(prisma);

      await expect(
        service.addPaymentForProvider({
          actorUserId: 'provider-user',
          requestId: 'r1',
          amountRubles: 5000,
          comment: 'Аванс',
          type: 'CONTRACT',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.markPaymentPaidForProvider({
          actorUserId: 'provider-user',
          requestId: 'r1',
          paymentId: 'p1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it.each(['CANCELLED', 'CLOSED'])(
    'customer financial writes are rejected in %s',
    async (status) => {
      const payment = {
        id: 'p1',
        type: 'CONTRACT' as const,
        amountRubles: 5000,
        comment: 'Аванс',
        paidAt: null,
        createdAt: NOW,
        createdByUserId: 'customer',
      };
      const prisma = {
        request: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'r1',
            status,
            providerId: PROVIDER_ID,
            customerUserId: 'customer',
            lockedAt: NOW,
            contractAcceptedAt: NOW,
            totalAmountRubles: 25000,
            priceProposals: [],
            payments: [payment],
          }),
        },
      };
      const service = makeService(prisma);

      await expect(
        service.addPaymentForCustomer({
          actorUserId: 'customer',
          requestId: 'r1',
          amountRubles: 5000,
          comment: 'Аванс',
          type: 'CONTRACT',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.markPaymentPaidForCustomer({
          actorUserId: 'customer',
          requestId: 'r1',
          paymentId: 'p1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('rejects price proposal and acceptance after COMPLETED', async () => {
    const proposal = {
      id: 'pp1',
      providerId: PROVIDER_ID,
      amountRubles: 25000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'provider-user',
      acceptedAt: null,
      acceptedByUserId: null,
      supersededAt: null,
      createdAt: NOW,
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'COMPLETED',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          lockedAt: NOW,
          contractAcceptedAt: NOW,
          totalAmountRubles: 25000,
          priceProposals: [proposal],
          payments: [],
        }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.proposePriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        amountRubles: 30000,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.acceptPriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        proposalId: 'pp1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a former provider from late payments after COMPLETED', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'COMPLETED',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          lockedAt: NOW,
          contractAcceptedAt: NOW,
          totalAmountRubles: 25000,
          priceProposals: [],
          payments: [],
        }),
      },
    };

    await expect(
      makeService(prisma, 'former-provider').addPaymentForProvider({
        actorUserId: 'former-user',
        requestId: 'r1',
        amountRubles: 5000,
        comment: 'Чужой платёж',
        type: 'CONTRACT',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects repeated paid mark without a second write', async () => {
    const paidPayment = {
      id: 'p1',
      type: 'CONTRACT' as const,
      amountRubles: 5000,
      comment: 'Финальный платёж',
      paidAt: NOW,
      createdAt: NOW,
      createdByUserId: 'provider-user',
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'COMPLETED',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          lockedAt: NOW,
          contractAcceptedAt: NOW,
          totalAmountRubles: 25000,
          priceProposals: [],
          payments: [paidPayment],
        }),
      },
      $transaction: vi.fn(),
    };

    await expect(
      makeService(prisma).markPaymentPaidForProvider({
        actorUserId: 'provider-user',
        requestId: 'r1',
        paymentId: 'p1',
      }),
    ).rejects.toThrow('Payment is already marked as paid');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

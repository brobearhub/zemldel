import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestPaymentsService } from './request-payments.service';

const NOW = new Date('2026-08-13T00:00:00.000Z');
const PROVIDER_ID = '11111111-1111-1111-1111-111111111111';

function makeService(prisma: object, providerId = PROVIDER_ID, chat?: object) {
  return new RequestPaymentsService(
    prisma as never,
    {
      getServiceManagementContext: vi.fn().mockResolvedValue({
        isPlatformAdmin: false,
        providerId,
      }),
    } as never,
    chat as never,
  );
}

describe('RequestPaymentsService', () => {
  it('replaces the initial service price when the provider changes it', async () => {
    const initialPrice = {
      id: 'initial-price',
      providerId: PROVIDER_ID,
      amountRubles: 11111,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: null,
      acceptedAt: null,
      acceptedByUserId: null,
      isDirectSet: true,
      supersededAt: null,
      createdAt: NOW,
    };
    const updatedPrice = {
      ...initialPrice,
      id: 'updated-price',
      amountRubles: 15000,
      proposedByUserId: 'provider-user',
    };
    const tx = {
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue(updatedPrice),
      },
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi
          .fn()
          .mockResolvedValue({ totalAmountRubles: 15000, payments: [] }),
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
          lockedAt: NOW,
          contractAcceptedAt: null,
          totalAmountRubles: 11111,
          payments: [],
          priceProposals: [initialPrice],
        }),
      },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };
    const service = makeService(prisma);
    vi.spyOn(
      service as unknown as { noteTargets: () => Promise<string[]> },
      'noteTargets',
    ).mockResolvedValue([]);

    const result = await service.proposePriceForProvider({
      actorUserId: 'provider-user',
      requestId: 'r1',
      amountRubles: 15000,
    });
    expect(tx.requestPriceProposal.updateMany).toHaveBeenCalledWith({
      where: { requestId: 'r1', providerId: PROVIDER_ID, supersededAt: null },
      data: { supersededAt: expect.any(Date) },
    });
    expect(tx.requestPriceProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountRubles: 15000,
          proposedByUserId: 'provider-user',
          isDirectSet: true,
        }),
      }),
    );
    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalAmountRubles: 15000 } }),
    );
    expect(result.totalAmountRubles).toBe(15000);
  });

  it('provider finance reads only payments from its server-derived scope', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
    };

    await makeService(prisma).getForProvider({
      actorUserId: 'provider-user',
      requestId: 'r1',
    });

    expect(prisma.request.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          payments: expect.objectContaining({
            where: { providerId: PROVIDER_ID },
          }),
        }),
      }),
    );
  });

  it('returns the saved price when chat target lookup fails after commit', async () => {
    const proposal = {
      id: 'direct-price',
      providerId: PROVIDER_ID,
      amountRubles: 15000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'provider-user',
      acceptedAt: null,
      acceptedByUserId: null,
      isDirectSet: true,
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
        update: vi
          .fn()
          .mockResolvedValue({ totalAmountRubles: 15000, payments: [] }),
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
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
        }),
      },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };
    const chat = { postFinanceNote: vi.fn() };
    const service = makeService(prisma, PROVIDER_ID, chat);
    vi.spyOn(
      service as unknown as { noteTargets: () => Promise<string[]> },
      'noteTargets',
    ).mockRejectedValue(new Error('temporary chat failure'));

    const dto = await service.proposePriceForProvider({
      actorUserId: 'provider-user',
      requestId: 'r1',
      amountRubles: 15000,
    });
    expect(dto.totalAmountRubles).toBe(15000);
    expect(tx.requestEvent.create).toHaveBeenCalledOnce();
    expect(chat.postFinanceNote).not.toHaveBeenCalled();
  });

  it('reads the latest scoped provider price inside a payment transaction', async () => {
    const oldPrice = {
      id: 'old-price',
      providerId: PROVIDER_ID,
      amountRubles: 12000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'provider-user',
      acceptedAt: null,
      acceptedByUserId: null,
      isDirectSet: true,
      supersededAt: null,
      createdAt: NOW,
    };
    const newPrice = { ...oldPrice, id: 'new-price', amountRubles: 18000 };
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: vi.fn().mockResolvedValue({
          totalAmountRubles: 99999,
          payments: [],
          priceProposals: [newPrice],
        }),
      },
      requestPayment: { create: vi.fn() },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: 99999,
          payments: [],
          priceProposals: [oldPrice],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };
    const dto = await makeService(prisma).addPaymentForProvider({
      actorUserId: 'provider-user',
      requestId: 'r1',
      amountRubles: 1000,
      comment: 'Аванс',
    });
    expect(dto.totalAmountRubles).toBe(18000);
    expect(dto.priceProposal).toBeNull();
    expect(tx.request.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          priceProposals: expect.objectContaining({
            where: { providerId: PROVIDER_ID, supersededAt: null },
          }),
        }),
      }),
    );
  });

  it('sets provider A price without overwriting provider B price or global total', async () => {
    const providerB = '22222222-2222-2222-2222-222222222222';
    const state = {
      total: 22000,
      proposals: [
        {
          id: 'old-a',
          providerId: PROVIDER_ID,
          amountRubles: 12000,
          authorSide: 'PROVIDER' as const,
          proposedByUserId: 'provider-a-user',
          acceptedAt: null,
          acceptedByUserId: null,
          isDirectSet: false,
          supersededAt: null as Date | null,
          createdAt: NOW,
        },
        {
          id: 'price-b',
          providerId: providerB,
          amountRubles: 22000,
          authorSide: 'PROVIDER' as const,
          proposedByUserId: 'provider-b-user',
          acceptedAt: null,
          acceptedByUserId: null,
          isDirectSet: true,
          supersededAt: null as Date | null,
          createdAt: NOW,
        },
      ],
    };
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(({ data }: { data: { totalAmountRubles?: number } }) => {
          if (data.totalAmountRubles != null)
            state.total = data.totalAmountRubles;
          return { totalAmountRubles: state.total, payments: [] };
        }),
      },
      requestPriceProposal: {
        updateMany: vi.fn(
          ({
            where,
            data,
          }: {
            where: { providerId: string };
            data: { supersededAt: Date };
          }) => {
            for (const proposal of state.proposals) {
              if (
                proposal.providerId === where.providerId &&
                !proposal.supersededAt
              )
                proposal.supersededAt = data.supersededAt;
            }
            return { count: 1 };
          },
        ),
        create: vi.fn(
          ({
            data,
          }: {
            data: { amountRubles: number; isDirectSet: boolean };
          }) => {
            const proposal = {
              ...state.proposals[0],
              id: 'new-a',
              amountRubles: data.amountRubles,
              isDirectSet: data.isDirectSet,
              supersededAt: null,
            };
            state.proposals.push(proposal);
            return proposal;
          },
        ),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: providerB,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: state.total,
          payments: [],
          priceProposals: [state.proposals[0]],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
      $transaction: vi.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };
    const dto = await makeService(prisma).proposePriceForProvider({
      actorUserId: 'provider-a-user',
      requestId: 'r1',
      amountRubles: 15000,
    });
    expect(dto).toMatchObject({
      totalAmountRubles: 15000,
      priceProposal: null,
      canAcceptPrice: false,
    });
    expect(state.total).toBe(22000);
    expect(
      state.proposals.find((proposal) => proposal.id === 'price-b'),
    ).toMatchObject({ amountRubles: 22000, supersededAt: null });
    expect(
      state.proposals.find((proposal) => proposal.id === 'old-a')?.supersededAt,
    ).toBeInstanceOf(Date);
  });

  it('does not allow a provider to accept a legacy customer proposal', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: PROVIDER_ID,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
        }),
      },
      $transaction: vi.fn(),
    };
    await expect(
      makeService(prisma).acceptPriceForProvider({
        actorUserId: 'provider-user',
        requestId: 'r1',
        proposalId: 'old-customer-proposal',
      }),
    ).rejects.toThrow('Price confirmation is no longer supported');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('provider cannot mark another provider payment', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
      $transaction: vi.fn(),
    };

    await expect(
      makeService(prisma).markPaymentPaidForProvider({
        actorUserId: 'provider-user',
        requestId: 'r1',
        paymentId: 'payment-b',
      }),
    ).rejects.toThrow('Payment not found');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('customer before lock reads finance only for its validated conversation', async () => {
    const prisma = {
      conversation: {
        findFirst: vi.fn().mockResolvedValue({
          providerId: 'provider-b',
        }),
      },
      request: {
        findFirst: vi.fn().mockResolvedValue({
          status: 'DISCUSSING',
          contractAcceptedAt: null,
          providerId: null,
          customerUserId: 'customer',
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
        }),
      },
    };

    await makeService(prisma).getForCustomer({
      actorUserId: 'customer',
      requestId: 'r1',
      conversationId: 'conversation-b',
    });

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-b',
        requestId: 'r1',
        customerUserId: 'customer',
      },
      select: { providerId: true },
    });
    expect(prisma.request.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          payments: expect.objectContaining({
            where: { providerId: 'provider-b' },
          }),
          priceProposals: expect.objectContaining({
            where: {
              providerId: 'provider-b',
              supersededAt: null,
            },
          }),
        }),
      }),
    );
  });

  it('provider A mutation is denied when customer selects B before transaction', async () => {
    const state = {
      providerId: null as string | null,
      lockedAt: null as Date | null,
      payments: [] as Array<{ providerId: string; amountRubles: number }>,
    };
    const tx = {
      request: {
        updateMany: vi
          .fn()
          .mockImplementation(
            ({
              where,
            }: {
              where: { providerId?: string | null; lockedAt?: null };
            }) => ({
              count:
                state.providerId === (where.providerId ?? state.providerId) &&
                (where.lockedAt !== null || state.lockedAt === null)
                  ? 1
                  : 0,
            }),
          ),
      },
      requestPayment: {
        create: vi
          .fn()
          .mockImplementation(
            ({
              data,
            }: {
              data: { providerId: string; amountRubles: number };
            }) => {
              state.payments.push(data);
            },
          ),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
      $transaction: vi.fn(
        async (fn: (client: typeof tx) => Promise<unknown>) => {
          state.providerId = 'provider-b';
          state.lockedAt = NOW;
          return fn(tx);
        },
      ),
    };

    await expect(
      makeService(prisma).addPaymentForProvider({
        actorUserId: 'provider-a-user',
        requestId: 'r1',
        amountRubles: 5000,
        comment: 'Аванс A',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(state.payments).toEqual([]);
  });

  it('FREEFORM A/B keeps scoped proposals and payments when select B rejects late A write', async () => {
    const state = {
      providerId: null as string | null,
      lockedAt: null as Date | null,
      proposals: [
        { providerId: PROVIDER_ID, amountRubles: 10000 },
        { providerId: 'provider-b', amountRubles: 20000 },
      ],
      payments: [
        { providerId: PROVIDER_ID, amountRubles: 1000 },
        { providerId: 'provider-b', amountRubles: 2000 },
      ],
    };
    const before = structuredClone(state);
    const tx = {
      request: {
        updateMany: vi.fn().mockImplementation(() => ({
          count: state.providerId == null && state.lockedAt == null ? 1 : 0,
        })),
      },
      requestPayment: {
        create: vi
          .fn()
          .mockImplementation(({ data }) => state.payments.push(data)),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'freeform-r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: 10000,
          payments: state.payments.filter(
            (payment) => payment.providerId === PROVIDER_ID,
          ),
          priceProposals: [],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) => {
          state.providerId = 'provider-b';
          state.lockedAt = NOW;
          return callback(tx);
        },
      ),
    };

    await expect(
      makeService(prisma).addPaymentForProvider({
        actorUserId: 'provider-a-user',
        requestId: 'freeform-r1',
        amountRubles: 3000,
        comment: 'Поздний платёж A',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(state.proposals).toEqual(before.proposals);
    expect(state.payments).toEqual(before.payments);
    expect(state.providerId).toBe('provider-b');
  });

  it('customer locked to B cannot mark payment from A', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          providerId: 'provider-b',
          customerUserId: 'customer',
          lockedAt: NOW,
          contractAcceptedAt: NOW,
          totalAmountRubles: 20000,
          payments: [],
          priceProposals: [],
        }),
      },
      $transaction: vi.fn(),
    };

    await expect(
      makeService(prisma).markPaymentPaidForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        paymentId: 'payment-a',
      }),
    ).rejects.toThrow('Payment not found');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not allow a customer to accept a legacy price proposal', async () => {
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

    await expect(
      makeService(prisma).acceptPriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        proposalId: 'pp1',
      }),
    ).rejects.toThrow('Price confirmation is no longer supported');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.requestPriceProposal.updateMany).not.toHaveBeenCalled();
    expect(tx.request.update).not.toHaveBeenCalled();
  });

  it('provider A price response excludes provider B payments', async () => {
    const proposal = {
      id: 'proposal-a',
      providerId: PROVIDER_ID,
      amountRubles: 12000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'provider-a-user',
      isDirectSet: true,
      acceptedAt: null,
      acceptedByUserId: null,
      supersededAt: null,
      createdAt: NOW,
    };
    const payments = [
      {
        id: 'payment-a',
        providerId: PROVIDER_ID,
        type: 'CONTRACT' as const,
        amountRubles: 1000,
        comment: 'Комментарий A',
        paidAt: NOW,
        createdAt: NOW,
        createdByUserId: 'provider-a-user',
      },
      {
        id: 'payment-b',
        providerId: 'provider-b',
        type: 'OTHER' as const,
        amountRubles: 99000,
        comment: 'Секретный комментарий B',
        paidAt: NOW,
        createdAt: NOW,
        createdByUserId: 'provider-b-user',
      },
    ];
    const tx = {
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockImplementation(
          ({
            select,
            data,
          }: {
            select: {
              payments: { where?: { providerId: string } };
            };
            data: { totalAmountRubles: number | null };
          }) => ({
            totalAmountRubles: data.totalAmountRubles,
            payments: select.payments.where
              ? payments.filter(
                  (payment) =>
                    payment.providerId === select.payments.where?.providerId,
                )
              : payments,
          }),
        ),
      },
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue(proposal),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          serviceId: null,
          categoryId: null,
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [payments[0]],
          priceProposals: [],
          providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
        }),
      },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = makeService(prisma);

    const dto = await service.proposePriceForProvider({
      actorUserId: 'provider-a-user',
      requestId: 'r1',
      amountRubles: 12000,
    });
    expect(dto.totalAmountRubles).toBe(12000);
    expect(dto.priceProposal).toBeNull();
    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: {} }),
    );

    expect(dto.payments).toEqual([
      expect.objectContaining({
        id: 'payment-a',
        amountRubles: 1000,
        comment: 'Комментарий A',
      }),
    ]);
    expect(JSON.stringify(dto)).not.toContain('Секретный комментарий B');
    expect(JSON.stringify(dto)).not.toContain('99000');
  });

  it('customer cannot propose a price in a validated FREEFORM conversation', async () => {
    const prisma = {
      request: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'DISCUSSING',
          providerId: null,
          customerUserId: 'customer',
          lockedAt: null,
          contractAcceptedAt: null,
          totalAmountRubles: null,
          payments: [],
          priceProposals: [],
        }),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue({ providerId: PROVIDER_ID }),
      },
    };

    const dto = await makeService(prisma).getForCustomer({
      actorUserId: 'customer',
      requestId: 'r1',
      conversationId: 'conversation-a',
    });

    expect(dto.priceProposal).toBeNull();
    expect(dto.canProposePrice).toBe(false);
    expect(dto.canAcceptPrice).toBe(false);
  });

  it('customer accept A is denied after select B and keeps B total intact', async () => {
    const proposalA = {
      id: 'proposal-a',
      providerId: PROVIDER_ID,
      amountRubles: 12000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'provider-a-user',
      acceptedAt: null,
      acceptedByUserId: null,
      supersededAt: null,
      createdAt: NOW,
    };
    const state = {
      providerId: 'provider-b',
      lockedAt: NOW,
      totalAmountRubles: 22000,
      proposalAAcceptedAt: null as Date | null,
    };
    const tx = {
      request: {
        updateMany: vi.fn().mockImplementation(() => ({ count: 1 })),
        update: vi.fn().mockImplementation(() => {
          state.totalAmountRubles = proposalA.amountRubles;
          return { totalAmountRubles: state.totalAmountRubles, payments: [] };
        }),
      },
      requestPriceProposal: {
        updateMany: vi.fn().mockImplementation(() => {
          state.proposalAAcceptedAt = NOW;
          return { count: 1 };
        }),
      },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      request: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({
            providerId: null,
            lockedAt: null,
            customerUserId: 'customer',
          })
          .mockResolvedValueOnce({
            id: 'r1',
            status: 'DISCUSSING',
            providerId: state.providerId,
            customerUserId: 'customer',
            lockedAt: state.lockedAt,
            contractAcceptedAt: null,
            totalAmountRubles: state.totalAmountRubles,
            payments: [],
            priceProposals: [proposalA],
          }),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue({ providerId: PROVIDER_ID }),
      },
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    await expect(
      makeService(prisma).acceptPriceForCustomer({
        actorUserId: 'customer',
        requestId: 'r1',
        proposalId: proposalA.id,
        conversationId: 'conversation-a',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(state.totalAmountRubles).toBe(22000);
    expect(state.proposalAAcceptedAt).toBeNull();
  });

  it.each([{ action: 'add' as const }, { action: 'mark' as const }])(
    'provider A $action payment response does not expose pre-lock total B',
    async ({ action }) => {
      const payment = {
        id: 'payment-a',
        type: 'CONTRACT' as const,
        amountRubles: 1000,
        comment: 'Платёж A',
        paidAt: action === 'mark' ? NOW : null,
        createdAt: NOW,
        createdByUserId: 'provider-a-user',
      };
      const tx = {
        request: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirstOrThrow: vi.fn().mockResolvedValue({
            totalAmountRubles: 22000,
            payments: [payment],
          }),
        },
        requestPayment: {
          create: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requestEvent: { create: vi.fn() },
      };
      const prisma = {
        request: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'r1',
            status: 'DISCUSSING',
            serviceId: null,
            categoryId: null,
            providerId: null,
            customerUserId: 'customer',
            lockedAt: null,
            contractAcceptedAt: null,
            totalAmountRubles: 22000,
            payments: action === 'mark' ? [{ ...payment, paidAt: null }] : [],
            priceProposals: [
              {
                id: 'proposal-b',
                providerId: 'provider-b',
                amountRubles: 22000,
                authorSide: 'PROVIDER',
                acceptedAt: NOW,
                supersededAt: null,
                createdAt: NOW,
              },
            ],
            providerOffers: [{ providerId: PROVIDER_ID, status: 'SELECTED' }],
          }),
        },
        $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      };
      const service = makeService(prisma);

      const dto =
        action === 'add'
          ? await service.addPaymentForProvider({
              actorUserId: 'provider-a-user',
              requestId: 'r1',
              amountRubles: 1000,
              comment: 'Платёж A',
            })
          : await service.markPaymentPaidForProvider({
              actorUserId: 'provider-a-user',
              requestId: 'r1',
              paymentId: payment.id,
            });

      expect(dto.totalAmountRubles).toBeNull();
      expect(dto.remainingAmountRubles).toBeNull();
      expect(dto.priceProposal).toBeNull();
      expect(dto.payments.map((item) => item.id)).toEqual(['payment-a']);
    },
  );

  it.each([{ action: 'add' as const }, { action: 'mark' as const }])(
    'customer in conversation A $action payment response does not expose total B',
    async ({ action }) => {
      const unpaidPayment = {
        id: 'payment-a',
        type: 'CONTRACT' as const,
        amountRubles: 1000,
        comment: 'Платёж A',
        paidAt: null,
        createdAt: NOW,
        createdByUserId: 'customer',
      };
      const tx = {
        request: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findFirstOrThrow: vi.fn().mockResolvedValue({
            totalAmountRubles: 22000,
            payments: [
              {
                ...unpaidPayment,
                paidAt: action === 'mark' ? NOW : null,
              },
            ],
          }),
        },
        requestPayment: {
          create: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        requestEvent: { create: vi.fn() },
      };
      const request = {
        id: 'r1',
        status: 'DISCUSSING',
        providerId: null,
        customerUserId: 'customer',
        lockedAt: null,
        contractAcceptedAt: null,
        totalAmountRubles: 22000,
        payments: action === 'mark' ? [unpaidPayment] : [],
        priceProposals: [
          {
            id: 'proposal-b',
            providerId: 'provider-b',
            amountRubles: 22000,
            authorSide: 'PROVIDER',
            acceptedAt: NOW,
            supersededAt: null,
            createdAt: NOW,
          },
        ],
      };
      const prisma = {
        request: { findFirst: vi.fn().mockResolvedValue(request) },
        conversation: {
          findFirst: vi.fn().mockResolvedValue({ providerId: PROVIDER_ID }),
        },
        $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      };
      const service = makeService(prisma);

      const dto =
        action === 'add'
          ? await service.addPaymentForCustomer({
              actorUserId: 'customer',
              requestId: 'r1',
              conversationId: 'conversation-a',
              amountRubles: 1000,
              comment: 'Платёж A',
            })
          : await service.markPaymentPaidForCustomer({
              actorUserId: 'customer',
              requestId: 'r1',
              conversationId: 'conversation-a',
              paymentId: unpaidPayment.id,
            });

      expect(dto.totalAmountRubles).toBeNull();
      expect(dto.remainingAmountRubles).toBeNull();
      expect(dto.priceProposal).toBeNull();
      expect(dto.payments.map((item) => item.id)).toEqual(['payment-a']);
    },
  );

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

  it('new direct price supersedes the previous price and sets the total', async () => {
    const tx = {
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({
          id: 'pp2',
          providerId: PROVIDER_ID,
          amountRubles: 15000,
          authorSide: 'PROVIDER',
          proposedByUserId: 'provider-user',
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
              authorSide: 'PROVIDER',
              proposedByUserId: 'provider-user',
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

    const dto = await makeService(prisma).proposePriceForProvider({
      actorUserId: 'provider-user',
      requestId: 'r1',
      amountRubles: 15000,
    });

    expect(tx.requestPriceProposal.updateMany).toHaveBeenCalledWith({
      where: { requestId: 'r1', providerId: PROVIDER_ID, supersededAt: null },
      data: { supersededAt: expect.any(Date) },
    });
    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalAmountRubles: 15000 } }),
    );
    expect(dto.totalAmountRubles).toBe(15000);
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
      makeService(prisma).proposePriceForProvider({
        actorUserId: 'provider-user',
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
            authorSide: 'PROVIDER',
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
      makeService(prisma).proposePriceForProvider({
        actorUserId: 'provider-user',
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
          providerId: PROVIDER_ID,
          lockedAt: NOW,
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

  it.each([
    { totalAmountRubles: null, conversationId: undefined },
    { totalAmountRubles: null, conversationId: 'conversation-a' },
    { totalAmountRubles: 12000, conversationId: undefined },
    { totalAmountRubles: 12000, conversationId: 'conversation-a' },
  ])(
    'denies customer price writes without changing finance: %j',
    async ({ totalAmountRubles, conversationId }) => {
      const prisma = {
        request: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'r1',
            status: 'DISCUSSING',
            providerId: PROVIDER_ID,
            customerUserId: 'customer',
            lockedAt: NOW,
            contractAcceptedAt: null,
            totalAmountRubles,
            priceProposals: [],
            payments: [],
          }),
        },
        conversation: {
          findFirst: vi.fn().mockResolvedValue({ providerId: PROVIDER_ID }),
        },
        $transaction: vi.fn(),
      };
      await expect(
        makeService(prisma).proposePriceForCustomer({
          actorUserId: 'customer',
          requestId: 'r1',
          amountRubles: 15000,
          conversationId,
        }),
      ).rejects.toThrow('Only the provider can change the price');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

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

  it('provider sets the first price immediately without recording customer acceptance', async () => {
    const proposal = {
      id: 'pp1',
      providerId: PROVIDER_ID,
      amountRubles: 15000,
      authorSide: 'PROVIDER' as const,
      proposedByUserId: 'u1',
      acceptedAt: null,
      acceptedByUserId: null,
      isDirectSet: true,
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
    expect(dto.totalAmountRubles).toBe(15000);
    expect(dto.priceProposal).toBeNull();
    expect(dto.canAcceptPrice).toBe(false);
    expect(tx.requestPriceProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDirectSet: true }),
      }),
    );
    const created = tx.requestPriceProposal.create.mock.calls[0][0].data;
    expect(created).not.toHaveProperty('acceptedAt');
    expect(created).not.toHaveProperty('acceptedByUserId');
    expect(tx.requestEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'PRICE_UPDATED' }),
      }),
    );
  });

  it('addPaymentForProvider creates CONTRACT payment as scheduled (paidAt=null)', async () => {
    const tx = {
      requestPayment: { create: vi.fn().mockResolvedValue(null) },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
      request: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
          customerUserId: 'u1',
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
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
          customerUserId: 'u1',
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
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
          customerUserId: 'u1',
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
        where: {
          id: 'p1',
          requestId: 'r1',
          providerId: PROVIDER_ID,
          paidAt: null,
        },
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
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
      service.proposePriceForProvider({
        actorUserId: 'provider-user',
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

  it('replays a paid mark without a second write', async () => {
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
    ).resolves.toMatchObject({ paidAmountRubles: 5000 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

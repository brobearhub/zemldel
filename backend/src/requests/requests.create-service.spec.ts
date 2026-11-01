import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(prisma: unknown) {
  return new RequestsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    { notifyMessageCreated: vi.fn() } as never,
  );
}

function makeCreatedRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-08-06T00:00:00.000Z');
  return {
    id: 'r1',
    status: 'NEW',
    serviceId: 's1',
    categoryId: null,
    providerId: 'p1',
    customerUserId: 'u1',
    requestCityId: null,
    customerName: 'Customer',
    customerEmail: 'customer@example.com',
    customerPhone: null,
    message: 'Нужна консультация',
    location: null,
    lockedAt: now,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    contractAcceptedByUserId: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    acceptedByUserId: null,
    createdAt: now,
    updatedAt: now,
    cadastralNumbers: [],
    servicePriceRubles: 15000,
    totalAmountRubles: null,
    providerOffers: [
      {
        providerId: 'p1',
        status: 'SELECTED',
        selectedAt: now,
        declinedAt: null,
      },
    ],
    service: {
      id: 's1',
      title: 'Услуга',
      imageUrl: null,
      providerId: 'p1',
    },
    category: null,
    provider: null,
    customerUser: null,
    payments: [],
    requestCity: null,
    ...overrides,
  };
}

describe('RequestsService.createForService', () => {
  it('SERVICE заявка создаётся сразу зафиксированной и с event фиксации', async () => {
    const created = makeCreatedRow();
    const tx = {
      request: {
        create: vi.fn().mockResolvedValue(created),
      },
      requestPriceProposal: {
        create: vi.fn().mockResolvedValue({
          id: 'pp1',
          providerId: 'p1',
          amountRubles: 15000,
          authorSide: 'PROVIDER',
          acceptedAt: null,
          createdAt: new Date('2026-08-06T00:00:00.000Z'),
        }),
      },
      requestEvent: {
        create: vi.fn().mockResolvedValue({ id: 'e1' }),
      },
    };
    const prisma = {
      service: {
        findFirst: vi.fn().mockResolvedValue({
          id: 's1',
          providerId: 'p1',
          price: '15 000 ₽',
          createdByUserId: 'provider-user',
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          name: 'Customer',
          email: 'customer@example.com',
          phone: null,
          customerCityId: null,
          accountKind: 'CUSTOMER',
          systemRole: 'CUSTOMER',
        }),
      },
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    const svc = makeService(prisma);
    const dto = await svc.createForService('s1', 'u1', {
      message: 'Нужна консультация',
    });

    expect(tx.request.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: 'p1',
          lockedAt: expect.any(Date),
          providerOffers: {
            create: expect.objectContaining({
              providerId: 'p1',
              status: 'SELECTED',
              selectedAt: expect.any(Date),
            }),
          },
        }),
      }),
    );
    expect(tx.requestEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: 'r1',
          type: 'PROVIDER_SELECTED',
          actorUserId: 'u1',
          payload: expect.objectContaining({
            providerId: 'p1',
            autoLocked: true,
          }),
        }),
      }),
    );
    expect(tx.requestPriceProposal.create).toHaveBeenCalledWith({
      data: {
        requestId: 'r1',
        providerId: 'p1',
        amountRubles: 15000,
        authorSide: 'PROVIDER',
        proposedByUserId: 'provider-user',
      },
      select: {
        id: true,
        providerId: true,
        amountRubles: true,
        authorSide: true,
        acceptedAt: true,
        createdAt: true,
      },
    });
    expect(dto.totalAmountRubles).toBeNull();
    expect(dto.priceProposal?.amountRubles).toBe(15000);
    expect(dto.providerId).toBe('p1');
    expect(dto.lockedAt).not.toBeNull();
    expect(dto.selectedProviderIds).toEqual(['p1']);
  });
});

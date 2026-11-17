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
    number: 1,
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
  it.each([{ actor: 'u1' }, { actor: null }])(
    'sets the fixed service price without attributing it to customer $actor',
    async ({ actor }) => {
      const created = makeCreatedRow({
        customerUserId: actor,
        totalAmountRubles: 15000,
      });
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
      const dto = await svc.createForService('s1', actor, {
        message: 'Нужна консультация',
        customerEmail: 'customer@example.com',
      });
      expect(dto.number).toBe(1);

      expect(tx.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerId: 'p1',
            servicePriceRubles: 15000,
            totalAmountRubles: 15000,
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
            actorUserId: actor,
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
          proposedByUserId: null,
          isDirectSet: true,
        },
        select: { id: true },
      });
      expect(tx.requestEvent.create).toHaveBeenCalledWith({
        data: {
          requestId: 'r1',
          type: 'PRICE_UPDATED',
          actorUserId: null,
          actorProviderId: null,
          payload: {
            proposalId: 'pp1',
            providerId: 'p1',
            amountRubles: 15000,
            authorSide: 'PROVIDER',
            source: 'SERVICE_PRICE_SNAPSHOT',
          },
        },
        select: { id: true },
      });
      expect(dto.totalAmountRubles).toBe(15000);
      expect(dto.priceProposal).toBeNull();
      expect(dto.servicePriceRubles).toBe(15000);
      expect(dto.providerId).toBe('p1');
      expect(dto.lockedAt).not.toBeNull();
      expect(dto.selectedProviderIds).toEqual(['p1']);
    },
  );

  it.each([
    { price: 'от 15 000 ₽', snapshot: null },
    { price: '10 000–20 000 ₽', snapshot: null },
    { price: 'Договорная', snapshot: null },
    { price: '2147483648', snapshot: null },
  ])(
    'does not set a contract price for $price',
    async ({ price, snapshot }) => {
      const tx = {
        request: {
          create: vi.fn().mockResolvedValue(
            makeCreatedRow({
              servicePriceRubles: snapshot,
              totalAmountRubles: null,
            }),
          ),
        },
        requestPriceProposal: { create: vi.fn() },
        requestEvent: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
      };
      const prisma = {
        service: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: 's1', providerId: 'p1', price }),
        },
        $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
          fn(tx),
      };
      const dto = await makeService(prisma).createForService('s1', null, {
        customerEmail: 'customer@example.com',
      });
      expect(tx.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            servicePriceRubles: snapshot,
            totalAmountRubles: null,
          }),
        }),
      );
      expect(tx.requestPriceProposal.create).not.toHaveBeenCalled();
      expect(dto.totalAmountRubles).toBeNull();
    },
  );
});

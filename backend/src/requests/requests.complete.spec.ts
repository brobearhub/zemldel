import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

const NOW = new Date('2026-11-01T00:00:00.000Z');

function makeService(prisma: object) {
  return new RequestsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    { notifyMessageCreated: vi.fn() } as never,
  );
}

function makeAcceptedRequest() {
  return {
    id: 'r1',
    status: 'ACCEPTED',
    serviceId: null,
    categoryId: null,
    providerId: 'provider-1',
    customerUserId: 'customer-1',
    requestCityId: null,
    requestCity: null,
    customerName: 'Клиент',
    customerEmail: 'customer@example.com',
    customerPhone: null,
    message: null,
    location: null,
    cadastralNumbers: [],
    lockedAt: NOW,
    dealTerms: null,
    offerVersion: null,
    termsVersion: '2026-08-04',
    contractAcceptedAt: NOW,
    acceptanceRequestedAt: NOW,
    autoAcceptAt: null,
    acceptedAt: NOW,
    totalAmountRubles: 25000,
    servicePriceRubles: null,
    createdAt: NOW,
    updatedAt: NOW,
    service: null,
    category: null,
    provider: null,
    customerUser: null,
    providerOffers: [],
    payments: [
      {
        id: 'payment-1',
        providerId: 'provider-1',
        type: 'CONTRACT',
        amountRubles: 5000,
        comment: 'Аванс',
        paidAt: NOW,
        createdAt: NOW,
        createdByUserId: 'customer-1',
      },
    ],
    priceProposals: [],
  };
}

describe('RequestsService completeByProvider', () => {
  it('records expired acceptance as a system action without attributing it to the customer', async () => {
    const current = {
      ...makeAcceptedRequest(),
      status: 'ACCEPTANCE_PENDING',
      autoAcceptAt: new Date(0),
      acceptedAt: null,
    };
    const update = vi
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ ...current, ...data }),
      );
    const createEvent = vi.fn();
    const tx = { request: { update }, requestEvent: { create: createEvent } };
    const prisma = {
      request: { findFirst: vi.fn().mockResolvedValue(current) },
      message: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const result = await makeService(prisma).getMineById('customer-1', 'r1');
    expect(result.status).toBe('ACCEPTED');
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      data: { acceptedByUserId: null },
    });
    expect(createEvent.mock.calls[0]?.[0]).toMatchObject({
      data: { type: 'AUTO_ACCEPT', actorUserId: null },
    });
  });

  it('completes accepted work with a non-zero remainder and preserves it', async () => {
    const current = makeAcceptedRequest();
    const completed = { ...current, status: 'COMPLETED' };
    const tx = {
      request: {
        findFirst: vi.fn().mockResolvedValue(current),
        update: vi.fn().mockResolvedValue(completed),
      },
      requestEvent: { create: vi.fn().mockResolvedValue(null) },
    };
    const prisma = {
      $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };

    const result = await makeService(prisma).completeByProvider(
      'provider-1',
      'r1',
    );

    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: { status: 'COMPLETED' },
      }),
    );
    expect(result.status).toBe('COMPLETED');
    expect(result.remainingAmountRubles).toBe(20000);
  });
});

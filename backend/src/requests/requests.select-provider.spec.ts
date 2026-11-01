import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { formatCustomerSelectProviderChatMessage } from './dto/select-provider.dto';
import { RequestsService } from './requests.service';

function makeRequestRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-08-06T00:00:00.000Z');
  return {
    id: 'r1',
    status: 'DISCUSSING',
    serviceId: null,
    categoryId: 'cat1',
    providerId: null,
    customerUserId: 'cu1',
    requestCityId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    message: 'hi',
    location: null,
    lockedAt: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    contractAcceptedByUserId: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
    providerOffers: [],
    service: null,
    category: { name: 'Cat' },
    provider: null,
    customerUser: null,
    ...overrides,
  };
}

function makeService(
  prisma: unknown,
  chat = { notifyMessageCreated: vi.fn() },
) {
  return {
    svc: new RequestsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      chat as never,
    ),
    chat,
  };
}

describe('formatCustomerSelectProviderChatMessage', () => {
  it('различает первый выбор и повторный запрос', () => {
    expect(formatCustomerSelectProviderChatMessage(false)).toBe(
      'Заказчик выбрал вас исполнителем',
    );
    expect(formatCustomerSelectProviderChatMessage(true)).toBe(
      'Заказчик снова предложил вам выполнить заявку',
    );
  });
});

describe('RequestsService.selectProviderByCustomer', () => {
  it('сохраняет принятую цену выбранного provider B и не переносит цену A', async () => {
    const acceptedAt = new Date('2026-08-05T00:00:00.000Z');
    const row = makeRequestRow({
      providerId: null,
      totalAmountRubles: 11000,
      priceProposals: [
        {
          id: 'proposal-a',
          providerId: 'provider-a',
          amountRubles: 11000,
          authorSide: 'PROVIDER',
          acceptedAt,
          supersededAt: null,
          createdAt: acceptedAt,
        },
        {
          id: 'proposal-b',
          providerId: 'provider-b',
          amountRubles: 22000,
          authorSide: 'PROVIDER',
          acceptedAt,
          supersededAt: null,
          createdAt: acceptedAt,
        },
      ],
    });
    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn().mockImplementation(({ data }) => ({
          ...row,
          ...data,
          providerOffers: [],
        })),
      },
      requestProviderOffer: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'offer-b', status: 'SELECTED' }),
        upsert: vi.fn().mockResolvedValue({ id: 'offer-b' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      conversation: { findFirst: vi.fn().mockResolvedValue(null) },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
    };

    await makeService(prisma).svc.selectProviderByCustomer('cu1', 'r1', {
      providerId: 'provider-b',
    });

    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: 'provider-b',
          totalAmountRubles: 22000,
        }),
      }),
    );
  });

  it('после DECLINED снова ставит SELECTED и шлёт сообщение в чат', async () => {
    const row = makeRequestRow({
      providerId: 'old-provider',
      totalAmountRubles: 12000,
      priceProposals: [
        {
          id: 'old-proposal',
          providerId: 'old-provider',
          amountRubles: 12000,
          authorSide: 'PROVIDER',
          acceptedAt: new Date('2026-08-05T00:00:00.000Z'),
          createdAt: new Date('2026-08-04T00:00:00.000Z'),
        },
      ],
    });
    const offerUpsert = vi.fn().mockResolvedValue({ id: 'o1' });
    const messageCreate = vi.fn().mockResolvedValue({ id: 'm1' });
    const conversationUpdate = vi.fn().mockResolvedValue({ id: 'c1' });
    const refreshed = {
      ...row,
      providerId: 'p1',
      lockedAt: new Date('2026-08-06T01:00:00.000Z'),
      providerOffers: [
        {
          providerId: 'p1',
          status: 'SELECTED',
          selectedAt: new Date('2026-08-06T01:00:00.000Z'),
          declinedAt: null,
        },
      ],
    };

    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn().mockResolvedValue(refreshed),
      },
      requestProviderOffer: {
        findUnique: vi.fn().mockResolvedValue({ id: 'o1', status: 'DECLINED' }),
        upsert: offerUpsert,
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue({ id: 'c1' }),
        update: conversationUpdate,
      },
      message: { create: messageCreate },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };

    const { svc, chat } = makeService(prisma);

    const dto = await svc.selectProviderByCustomer('cu1', 'r1', {
      providerId: 'p1',
    });

    expect(offerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'SELECTED',
          declinedAt: null,
        }),
      }),
    );
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'c1',
          senderUserId: 'cu1',
          body: 'Заказчик снова предложил вам выполнить заявку',
        }),
      }),
    );
    expect(tx.requestPriceProposal.updateMany).toHaveBeenCalledWith({
      where: {
        requestId: 'r1',
        providerId: { not: 'p1' },
        supersededAt: null,
      },
      data: { supersededAt: expect.any(Date) },
    });
    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: 'p1',
          totalAmountRubles: null,
        }),
      }),
    );
    expect(chat.notifyMessageCreated).toHaveBeenCalledWith('m1');
    expect(dto.providerId).toBe('p1');
    expect(dto.selectedProviderIds).toContain('p1');
  });

  it('без conversation и offer → BadRequestException', async () => {
    const row = makeRequestRow();
    const tx = {
      request: { findUnique: vi.fn().mockResolvedValue(row) },
      requestProviderOffer: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) =>
        await fn(tx),
    };
    const { svc } = makeService(prisma);

    await expect(
      svc.selectProviderByCustomer('cu1', 'r1', { providerId: 'p1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RequestsService.cancelProviderSelectionByCustomer', () => {
  it('reopens a FREEFORM request and clears the selected deal price before contract', async () => {
    const row = makeRequestRow({
      categoryId: null,
      providerId: 'p1',
      lockedAt: new Date(),
      status: 'TERMS_AGREED',
      totalAmountRubles: 12000,
      providerOffers: [
        {
          providerId: 'p1',
          status: 'SELECTED',
          selectedAt: new Date(),
          declinedAt: null,
        },
      ],
    });
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'r1', customerUserId: 'cu1' }]),
      request: {
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn().mockImplementation(({ data }) => ({
          ...row,
          ...data,
          providerOffers: [
            {
              providerId: 'p1',
              status: 'CANCELLED_BY_CUSTOMER',
              selectedAt: new Date(),
              declinedAt: new Date(),
            },
          ],
        })),
      },
      requestProviderOffer: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      requestPriceProposal: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      requestContractFile: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      conversation: { findFirst: vi.fn().mockResolvedValue(null) },
      requestEvent: { create: vi.fn() },
    };
    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
    };
    const { svc } = makeService(prisma);

    const result = await svc.cancelProviderSelectionByCustomer('cu1', 'r1', {
      reason: 'Не согласовали условия',
    });

    expect(tx.request.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: null,
          lockedAt: null,
          status: 'DISCUSSING',
          totalAmountRubles: null,
        }),
      }),
    );
    expect(tx.requestPriceProposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'p1',
          supersededAt: null,
        }),
      }),
    );
    expect(tx.requestContractFile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'p1',
          status: { in: ['PENDING_CUSTOMER', 'APPROVED'] },
        }),
        data: expect.objectContaining({ status: 'REVISION_REQUESTED' }),
      }),
    );
    expect(tx.requestProviderOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED_BY_CUSTOMER' }),
      }),
    );
    expect(result.providerId).toBeNull();
  });

  it.each([
    { serviceId: 'service-1', contractAcceptedAt: null },
    { serviceId: null, contractAcceptedAt: new Date() },
  ])('does not release a SERVICE or signed request', async (overrides) => {
    const row = makeRequestRow({
      providerId: 'p1',
      lockedAt: new Date(),
      ...overrides,
    });
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'r1', customerUserId: 'cu1' }]),
      request: {
        findUnique: vi.fn().mockResolvedValue(row),
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
    };
    const { svc } = makeService(prisma);

    await expect(
      svc.cancelProviderSelectionByCustomer('cu1', 'r1', {
        reason: 'Изменились условия',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.request.update).not.toHaveBeenCalled();
  });
});

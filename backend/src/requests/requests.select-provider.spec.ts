import { BadRequestException } from '@nestjs/common';
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

function makeService(prisma: unknown, chat = { notifyMessageCreated: vi.fn() }) {
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
  it('после DECLINED снова ставит SELECTED и шлёт сообщение в чат', async () => {
    const row = makeRequestRow();
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
      conversation: {
        findFirst: vi.fn().mockResolvedValue({ id: 'c1' }),
        update: conversationUpdate,
      },
      message: { create: messageCreate },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => await fn(tx),
    };

    const { svc, chat } = makeService(prisma);

    const dto = await svc.selectProviderByCustomer('cu1', 'r1', { providerId: 'p1' });

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
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => await fn(tx),
    };
    const { svc } = makeService(prisma);

    await expect(
      svc.selectProviderByCustomer('cu1', 'r1', { providerId: 'p1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

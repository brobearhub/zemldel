import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { formatProviderDeclineChatMessage } from './dto/decline-offer.dto';
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
    providerOffers: [{ providerId: 'p1', status: 'SELECTED', selectedAt: now, declinedAt: null }],
    service: null,
    category: { name: 'Cat' },
    provider: null,
    customerUser: null,
    ...overrides,
  };
}

function makeChat() {
  return {
    notifyMessageCreated: vi.fn().mockResolvedValue(undefined),
  };
}

function makeService(prisma: unknown, chat = makeChat()) {
  const auth = {} as never;
  const internalAuth = {} as never;
  const legalDocs = {} as never;
  return {
    svc: new RequestsService(
      prisma as never,
      auth,
      internalAuth,
      legalDocs,
      chat as never,
    ),
    chat,
  };
}

describe('formatProviderDeclineChatMessage', () => {
  it('форматирует причину по шаблону', () => {
    expect(formatProviderDeclineChatMessage('  нет времени  ')).toBe(
      'Исполнитель отказался от выполнения заявки по причине: "нет времени"',
    );
  });
});

describe('RequestsService.declineOfferByProvider', () => {
  it('пустой reason → BadRequestException', async () => {
    const { svc } = makeService({});
    await expect(
      svc.declineOfferByProvider('p1', 'r1', { reason: '   ', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('с reason отклоняет оффер и пишет сообщение в чат', async () => {
    const row = makeRequestRow();
    const messageCreate = vi.fn().mockResolvedValue({ id: 'm1' });
    const conversationUpdate = vi.fn().mockResolvedValue({ id: 'c1' });
    const offerUpdate = vi.fn().mockResolvedValue({ id: 'o1' });

    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValueOnce(row).mockResolvedValueOnce(row),
      },
      requestProviderOffer: {
        findUnique: vi.fn().mockResolvedValue({ id: 'o1', status: 'SELECTED' }),
        update: offerUpdate,
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
      conversation: { findMany: vi.fn().mockResolvedValue([{ requestId: 'r1' }]) },
    };

    const { svc, chat } = makeService(prisma);

    await svc.declineOfferByProvider('p1', 'r1', {
      reason: 'занят',
      actorUserId: 'u-pro',
    });

    expect(offerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DECLINED' }),
      }),
    );
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'c1',
          senderUserId: 'u-pro',
          body: 'Исполнитель отказался от выполнения заявки по причине: "занят"',
        }),
      }),
    );
    expect(conversationUpdate).toHaveBeenCalled();
    expect(chat.notifyMessageCreated).toHaveBeenCalledWith('m1');
  });

  it('без conversation decline проходит, message не создаётся', async () => {
    const row = makeRequestRow();
    const messageCreate = vi.fn();
    const offerUpdate = vi.fn().mockResolvedValue({ id: 'o1' });

    const tx = {
      request: {
        findUnique: vi.fn().mockResolvedValueOnce(row).mockResolvedValueOnce(row),
      },
      requestProviderOffer: {
        findUnique: vi.fn().mockResolvedValue({ id: 'o1', status: 'SELECTED' }),
        update: offerUpdate,
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      message: { create: messageCreate },
      requestEvent: { create: vi.fn() },
    };

    const prisma = {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => await fn(tx),
      conversation: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const { svc, chat } = makeService(prisma);

    await svc.declineOfferByProvider('p1', 'r1', {
      reason: 'нет',
      actorUserId: 'u-pro',
    });

    expect(offerUpdate).toHaveBeenCalled();
    expect(messageCreate).not.toHaveBeenCalled();
    expect(chat.notifyMessageCreated).not.toHaveBeenCalled();
  });
});

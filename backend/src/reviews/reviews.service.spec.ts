import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ReviewsService } from './reviews.service';

const PROVIDER_ID = '11111111-1111-4111-8111-111111111111';
const CUSTOMER_ID = '22222222-2222-4222-8222-222222222222';
const SERVICE_ID = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';

function readyRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    status: 'ACCEPTED',
    providerId: PROVIDER_ID,
    customerUserId: CUSTOMER_ID,
    serviceId: SERVICE_ID,
    ...overrides,
  };
}

function makeService(prisma: object) {
  return new ReviewsService(prisma as never);
}

describe('ReviewsService.createReview', () => {
  it('отклоняет отзыв до принятия результата', async () => {
    const prisma = {
      request: { findUnique: vi.fn().mockResolvedValue(readyRequest({ status: 'ACTIVE' })) },
    };
    await expect(
      makeService(prisma).createReview({ actorUserId: CUSTOMER_ID, requestId: REQUEST_ID, rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('запрещает самооценку, если заказчик состоит в провайдере сделки', async () => {
    const prisma = {
      request: { findUnique: vi.fn().mockResolvedValue(readyRequest()) },
      providerMember: { findFirst: vi.fn().mockResolvedValue({ id: 'member' }) },
    };
    await expect(
      makeService(prisma).createReview({ actorUserId: CUSTOMER_ID, requestId: REQUEST_ID, rating: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('оценка заказчика пересчитывает услугу и провайдера', async () => {
    const tx = {
      review: {
        create: vi.fn().mockResolvedValue({
          id: 'review-1',
          direction: 'CUSTOMER_TO_PROVIDER',
          rating: 5,
          text: null,
          createdAt: new Date('2026-10-06T00:00:00.000Z'),
          replyText: null,
          repliedAt: null,
          author: { name: 'Анна Кузнецова' },
          service: { title: 'Межевание' },
        }),
        aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } }),
      },
      service: { update: vi.fn().mockResolvedValue(null) },
      provider: { update: vi.fn().mockResolvedValue(null) },
      user: { update: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    const prisma = {
      request: { findUnique: vi.fn().mockResolvedValue(readyRequest()) },
      providerMember: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };

    const dto = await makeService(prisma).createReview({
      actorUserId: CUSTOMER_ID,
      requestId: REQUEST_ID,
      rating: 5,
    });

    expect(dto.direction).toBe('CUSTOMER_TO_PROVIDER');
    expect(dto.authorDisplayName).toBe('Анна К.');
    expect(tx.service.update).toHaveBeenCalledWith({
      where: { id: SERVICE_ID },
      data: { rating: 5, reviewCount: 1, ratingSortScore: 4.1667 },
    });
    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: PROVIDER_ID },
      data: { rating: 5, reviewCount: 1 },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('оценка провайдера пересчитывает только рейтинг заказчика', async () => {
    const tx = {
      review: {
        create: vi.fn().mockImplementation(async ({ data }: { data: { direction: string } }) => ({
          id: 'review-2',
          direction: data.direction,
          rating: 4,
          text: 'аккуратно',
          createdAt: new Date('2026-10-06T00:00:00.000Z'),
          replyText: null,
          repliedAt: null,
          author: { name: 'Пётр' },
          service: null,
        })),
        aggregate: vi.fn().mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 1 } }),
      },
      service: { update: vi.fn() },
      provider: { update: vi.fn() },
      user: { update: vi.fn().mockResolvedValue(null) },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    const prisma = {
      request: { findUnique: vi.fn().mockResolvedValue(readyRequest({ serviceId: null })) },
      providerMember: {
        findFirst: vi.fn().mockImplementation(async ({ where }: { where: { userId: string } }) => {
          if (where.userId === CUSTOMER_ID) return null;
          return { id: 'member' };
        }),
      },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };

    const dto = await makeService(prisma).createReview({
      actorUserId: '55555555-5555-4555-8555-555555555555',
      requestId: REQUEST_ID,
      rating: 4,
      text: 'аккуратно',
    });

    expect(dto.direction).toBe('PROVIDER_TO_CUSTOMER');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: CUSTOMER_ID },
      data: { customerRating: 4, customerReviewCount: 1 },
    });
    expect(tx.service.update).not.toHaveBeenCalled();
    expect(tx.provider.update).not.toHaveBeenCalled();
  });

  it('повтор отзыва возвращает конфликт', async () => {
    const prisma = {
      request: { findUnique: vi.fn().mockResolvedValue(readyRequest()) },
      providerMember: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn().mockRejectedValue({ code: 'P2002' }),
    };
    await expect(
      makeService(prisma).createReview({ actorUserId: CUSTOMER_ID, requestId: REQUEST_ID, rating: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ReviewsService.reply', () => {
  it('не пересчитывает рейтинг при ответе', async () => {
    const prisma = {
      review: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'review-1',
          direction: 'CUSTOMER_TO_PROVIDER',
          providerId: PROVIDER_ID,
          replyText: null,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'review-1',
          direction: 'CUSTOMER_TO_PROVIDER',
          rating: 5,
          text: null,
          createdAt: new Date('2026-10-06T00:00:00.000Z'),
          replyText: 'спасибо',
          repliedAt: new Date('2026-10-06T01:00:00.000Z'),
          author: { name: 'Анна' },
          service: { title: 'Межевание' },
        }),
        aggregate: vi.fn(),
      },
      providerMember: { findFirst: vi.fn().mockResolvedValue({ id: 'member' }) },
    };

    const dto = await makeService(prisma).reply({
      actorUserId: '55555555-5555-4555-8555-555555555555',
      reviewId: 'review-1',
      text: 'спасибо',
    });

    expect(dto.replyText).toBe('спасибо');
    expect(prisma.review.aggregate).not.toHaveBeenCalled();
  });
});

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  displayRating,
  formatAuthorDisplayName,
  normalizeReviewText,
  ratingSortScore,
  REVIEW_TEXT_MAX_LENGTH,
} from './review-rating';

const REVIEWABLE_STATUSES = new Set(['ACCEPTED', 'COMPLETED']);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type ReviewDirection = 'CUSTOMER_TO_PROVIDER' | 'PROVIDER_TO_CUSTOMER';

const reviewInclude = {
  author: { select: { name: true } },
  service: { select: { title: true } },
} satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export type ReviewDto = {
  id: string;
  direction: ReviewDirection;
  rating: number;
  text: string | null;
  createdAt: string;
  authorDisplayName: string;
  serviceTitle: string | null;
  replyText: string | null;
  repliedAt: string | null;
};

export type ReviewListDto = {
  items: ReviewDto[];
  nextCursor: string | null;
};

type Tx = Prisma.TransactionClient;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

function encodeCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

function decodeCursor(cursor: string | undefined): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const splitAt = cursor.lastIndexOf('|');
  if (splitAt <= 0) return null;
  const createdAt = new Date(cursor.slice(0, splitAt));
  const id = cursor.slice(splitAt + 1);
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
}

function toDto(row: ReviewRow): ReviewDto {
  return {
    id: row.id,
    direction: row.direction,
    rating: row.rating,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    authorDisplayName: formatAuthorDisplayName(row.author.name),
    serviceTitle: row.service?.title ?? null,
    replyText: row.replyText,
    repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
  };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForService(serviceId: string, query: { limit?: number; cursor?: string }): Promise<ReviewListDto> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return this.listPublic({
      serviceId,
      direction: 'CUSTOMER_TO_PROVIDER',
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  async listForProvider(providerId: string, query: { limit?: number; cursor?: string }): Promise<ReviewListDto> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.listPublic({
      providerId,
      direction: 'CUSTOMER_TO_PROVIDER',
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  async listForRequest(input: { actorUserId: string; requestId: string }): Promise<ReviewDto[]> {
    const request = await this.prisma.request.findUnique({
      where: { id: input.requestId },
      select: { id: true, providerId: true, customerUserId: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId || !request.customerUserId) return [];
    await this.assertParty(input.actorUserId, {
      customerUserId: request.customerUserId,
      providerId: request.providerId,
    });
    const rows = await this.prisma.review.findMany({
      where: { requestId: input.requestId },
      include: reviewInclude,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDto);
  }

  async createReview(input: {
    actorUserId: string;
    requestId: string;
    rating: number;
    text?: string | null;
  }): Promise<ReviewDto> {
    const text = normalizeReviewText(input.text);
    if (text && text.length > REVIEW_TEXT_MAX_LENGTH) {
      throw new ConflictException('Review text is too long');
    }
    const request = await this.prisma.request.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        providerId: true,
        customerUserId: true,
        serviceId: true,
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!REVIEWABLE_STATUSES.has(request.status) || !request.providerId || !request.customerUserId) {
      throw new ForbiddenException('Request is not ready for review');
    }

    const providerId = request.providerId;
    const customerUserId = request.customerUserId;
    const selfDeal = await this.prisma.providerMember.findFirst({
      where: { providerId, userId: customerUserId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (selfDeal) throw new ConflictException('Self review is not allowed');

    const direction = await this.resolveDirection(input.actorUserId, customerUserId, providerId);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.review.create({
          data: {
            requestId: request.id,
            direction,
            providerId,
            serviceId: direction === 'CUSTOMER_TO_PROVIDER' ? request.serviceId : null,
            authorUserId: input.actorUserId,
            subjectUserId: direction === 'PROVIDER_TO_CUSTOMER' ? customerUserId : null,
            rating: input.rating,
            text,
          },
          include: reviewInclude,
        });
        if (direction === 'CUSTOMER_TO_PROVIDER') {
          if (request.serviceId) await recomputeServiceRating(tx, request.serviceId);
          await recomputeProviderRating(tx, providerId);
        } else {
          await recomputeCustomerRating(tx, customerUserId);
        }
        return row;
      });
      return toDto(created);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Review already exists');
      throw error;
    }
  }

  async reply(input: { actorUserId: string; reviewId: string; text: string }): Promise<ReviewDto> {
    const text = normalizeReviewText(input.text);
    if (!text) throw new ConflictException('Reply text is required');
    if (text.length > REVIEW_TEXT_MAX_LENGTH) throw new ConflictException('Review text is too long');

    const review = await this.prisma.review.findUnique({
      where: { id: input.reviewId },
      select: { id: true, direction: true, providerId: true, replyText: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.direction !== 'CUSTOMER_TO_PROVIDER') {
      throw new ForbiddenException('Reply is not allowed');
    }
    if (review.replyText) throw new ConflictException('Reply already exists');

    const member = await this.prisma.providerMember.findFirst({
      where: {
        providerId: review.providerId,
        userId: input.actorUserId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException('Forbidden');

    const updated = await this.prisma.review.update({
      where: { id: review.id },
      data: {
        replyText: text,
        repliedAt: new Date(),
        repliedByUserId: input.actorUserId,
      },
      include: reviewInclude,
    });
    return toDto(updated);
  }

  private async listPublic(where: {
    serviceId?: string;
    providerId?: string;
    direction: ReviewDirection;
    limit?: number;
    cursor?: string;
  }): Promise<ReviewListDto> {
    const limit = clampLimit(where.limit);
    const cursor = decodeCursor(where.cursor);
    const rows = await this.prisma.review.findMany({
      where: {
        direction: where.direction,
        ...(where.serviceId ? { serviceId: where.serviceId } : {}),
        ...(where.providerId ? { providerId: where.providerId } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: reviewInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor = rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;
    return { items: page.map(toDto), nextCursor };
  }

  private async assertParty(
    actorUserId: string,
    request: { customerUserId: string; providerId: string },
  ) {
    if (actorUserId === request.customerUserId) return;
    const member = await this.prisma.providerMember.findFirst({
      where: {
        providerId: request.providerId,
        userId: actorUserId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException('Forbidden');
  }

  private async resolveDirection(
    actorUserId: string,
    customerUserId: string,
    providerId: string,
  ): Promise<ReviewDirection> {
    if (actorUserId === customerUserId) return 'CUSTOMER_TO_PROVIDER';
    const member = await this.prisma.providerMember.findFirst({
      where: {
        providerId,
        userId: actorUserId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException('Forbidden');
    return 'PROVIDER_TO_CUSTOMER';
  }
}

async function recomputeServiceRating(tx: Tx, serviceId: string) {
  await tx.$queryRaw`SELECT id FROM "Service" WHERE id = ${serviceId}::uuid FOR UPDATE`;
  const agg = await tx.review.aggregate({
    where: { serviceId, direction: 'CUSTOMER_TO_PROVIDER' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  const average = agg._avg.rating;
  await tx.service.update({
    where: { id: serviceId },
    data: {
      rating: displayRating(average, count),
      reviewCount: count,
      ratingSortScore: ratingSortScore(average, count),
    },
  });
}

async function recomputeProviderRating(tx: Tx, providerId: string) {
  await tx.$queryRaw`SELECT id FROM "Provider" WHERE id = ${providerId}::uuid FOR UPDATE`;
  const agg = await tx.review.aggregate({
    where: { providerId, direction: 'CUSTOMER_TO_PROVIDER' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  await tx.provider.update({
    where: { id: providerId },
    data: {
      rating: displayRating(agg._avg.rating, count),
      reviewCount: count,
    },
  });
}

async function recomputeCustomerRating(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
  const agg = await tx.review.aggregate({
    where: { subjectUserId: userId, direction: 'PROVIDER_TO_CUSTOMER' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  await tx.user.update({
    where: { id: userId },
    data: {
      customerRating: displayRating(agg._avg.rating, count),
      customerReviewCount: count,
    },
  });
}

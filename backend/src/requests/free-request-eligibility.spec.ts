import { describe, expect, it, vi } from 'vitest';
import {
  eligibleRequestCategories,
  freeRequestEligibilityWhere,
  providerRequestCategories,
} from './free-request-eligibility';
import { RequestsService } from './requests.service';

const categories = [
  { id: 'root', parentId: null },
  { id: 'child', parentId: 'root' },
  { id: 'leaf', parentId: 'child' },
  { id: 'sibling', parentId: 'root' },
];

describe('free request eligibility', () => {
  it('includes ancestors at every depth without widening a subcategory to its siblings or children', () => {
    expect([...eligibleRequestCategories(['leaf'], categories)]).toEqual([
      'leaf',
      'child',
      'root',
    ]);
    expect([...eligibleRequestCategories(['root'], categories)]).toEqual([
      'root',
    ]);
    expect([...eligibleRequestCategories([], categories)]).toEqual([]);
    expect([
      ...eligibleRequestCategories(
        ['a'],
        [
          { id: 'a', parentId: 'b' },
          { id: 'b', parentId: 'a' },
        ],
      ),
    ]).toEqual(['a', 'b']);
  });

  it('uses published services only and excludes providers without a region', async () => {
    const prisma = {
      service: {
        findMany: vi.fn().mockResolvedValue([{ categoryId: 'leaf' }]),
      },
      serviceCategory: { findMany: vi.fn().mockResolvedValue(categories) },
    };
    expect(
      await providerRequestCategories(prisma as never, 'provider'),
    ).toEqual(new Set(['leaf', 'child', 'root']));
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: 'provider', status: 'PUBLISHED' },
      }),
    );
    expect(freeRequestEligibilityWhere(null, ['leaf'])).toEqual({
      id: { in: [] },
    });
  });

  it('filters feed candidates in the database before the 200-item limit', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      request: { findMany },
      provider: {
        findUnique: vi.fn().mockResolvedValue({ city: { regionCode: '66' } }),
      },
      service: {
        findMany: vi.fn().mockResolvedValue([{ categoryId: 'leaf' }]),
      },
      serviceCategory: { findMany: vi.fn().mockResolvedValue(categories) },
    };
    const service = new RequestsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.listProFeed('provider', { scope: 'free' }),
    ).resolves.toEqual({ items: [] });
    const eligibility = freeRequestEligibilityWhere('66', [
      'leaf',
      'child',
      'root',
    ]);
    for (const call of findMany.mock.calls.slice(1)) {
      const query = call[0] as { take: number; where: { AND: unknown[] } };
      expect(query.take).toBe(200);
      expect(query.where.AND).toContainEqual(eligibility);
    }
  });
});

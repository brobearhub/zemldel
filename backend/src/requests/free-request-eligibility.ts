import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export type CategoryBranch = { id: string; parentId: string | null };

// A service in a subcategory can answer a broad parent-category request,
// but does not qualify for requests in a sibling subcategory.
export function eligibleRequestCategories(
  serviceCategories: Iterable<string>,
  categories: CategoryBranch[],
): Set<string> {
  const parents = new Map(categories.map((row) => [row.id, row.parentId]));
  const eligible = new Set<string>();
  for (const categoryId of serviceCategories) {
    let id: string | null | undefined = categoryId;
    while (id && !eligible.has(id)) {
      eligible.add(id);
      id = parents.get(id);
    }
  }
  return eligible;
}

export async function providerRequestCategories(
  prisma: PrismaService,
  providerId: string,
): Promise<Set<string>> {
  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      where: { providerId, status: 'PUBLISHED' },
      select: { categoryId: true },
    }),
    prisma.serviceCategory.findMany({ select: { id: true, parentId: true } }),
  ]);
  return eligibleRequestCategories(
    services.map((row) => row.categoryId),
    categories,
  );
}

export function freeRequestEligibilityWhere(
  regionCode: string | null,
  categoryIds: Iterable<string>,
): Prisma.RequestWhereInput {
  if (!regionCode) return { id: { in: [] } };
  return {
    serviceId: null,
    AND: [
      { OR: [{ categoryId: null }, { categoryId: { in: [...categoryIds] } }] },
      {
        OR: [
          { requestCity: { regionCode } },
          {
            requestCityId: null,
            customerUser: { customerCity: { regionCode } },
          },
        ],
      },
    ],
  };
}

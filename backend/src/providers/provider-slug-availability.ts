import type { Prisma } from '@prisma/client';
import { CLOSED_STATUSES } from '../billing/billing-catalog';

export const CUSTOM_SLUG_PATTERN = /^[a-z0-9]{1,64}$/;

// All slug writers (registration and paid changes) share the same namespace lock.
export async function lockProviderSlugs(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(71290438)`;
  await tx.providerSlugChange.updateMany({
    where: {
      reservedSlug: { not: null },
      OR: [
        { reservedUntil: { lte: new Date() } },
        { order: { status: { in: CLOSED_STATUSES } } },
      ],
    },
    data: { reservedSlug: null },
  });
}

export async function providerSlugTaken(
  db: Pick<Prisma.TransactionClient, 'provider' | 'providerSlugChange'>,
  slug: string,
) {
  const existing = await db.provider.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) return true;
  return Boolean(
    await db.providerSlugChange.findFirst({
      where: {
        reservedSlug: slug,
        reservedUntil: { gt: new Date() },
        order: { status: { notIn: CLOSED_STATUSES } },
      },
      select: { orderId: true },
    }),
  );
}

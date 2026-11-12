import type { Prisma } from '@prisma/client';

/** One lock serializes saving/removing interest and the first direct contact. */
export async function lockCustomerInterest(
  tx: Prisma.TransactionClient,
  userId: string,
  providerId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`interest:${providerId}:${userId}`}, 0))`;
}

export function shortCustomerName(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}) {
  const parts = user.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = (user.firstName?.trim() || parts[0] || '').split(/\s+/)[0];
  if (!first || first.includes('@') || /\d/.test(first)) return 'Клиент';
  const last = user.lastName?.trim() || (parts.length > 1 ? parts[1] : '');
  return last && !last.includes('@')
    ? `${first} ${Array.from(last)[0].toUpperCase()}.`
    : first;
}

export async function currentInterest(
  tx: Prisma.TransactionClient,
  userId: string,
  providerId: string,
) {
  const [profile, services] = await Promise.all([
    tx.providerFavorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
      select: { createdAt: true },
    }),
    tx.serviceFavorite.findMany({
      where: { userId, service: { providerId, status: 'PUBLISHED' } },
      select: { serviceId: true, service: { select: { title: true } } },
    }),
  ]);
  return {
    profile: Boolean(profile),
    services: services.map((row) => ({
      id: row.serviceId,
      title: row.service.title,
    })),
  };
}

import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export async function lockProviderClient(
  tx: Prisma.TransactionClient,
  providerId: string,
  id: string,
) {
  await tx.$queryRaw`SELECT id FROM "ProviderClient" WHERE id = ${id}::uuid AND "providerId" = ${providerId}::uuid FOR UPDATE`;
  const client = await tx.providerClient.findFirst({
    where: { id, providerId },
  });
  if (!client) throw new NotFoundException('Клиент не найден');
  return client;
}

export async function ensureProviderClient(
  tx: Prisma.TransactionClient,
  providerId: string,
  email: string,
  name: string | null,
  source: 'MANUAL' | 'CONTRACT',
) {
  // ON CONFLICT also serializes concurrent first-time creation for this address.
  const rows = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO "ProviderClient" (id, "providerId", email, name, source, "updatedAt")
    VALUES (${randomUUID()}::uuid, ${providerId}::uuid, ${email}, ${name}, ${source}::"ProviderClientSource", CURRENT_TIMESTAMP)
    ON CONFLICT ("providerId", email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `;
  return rows[0].id;
}

export async function attachClientRequests(
  tx: Prisma.TransactionClient,
  providerId: string,
  clientId: string,
  userId: string,
) {
  const newlyLinked = await tx.request.updateManyAndReturn({
    select: { id: true },
    where: {
      providerId,
      providerClientId: clientId,
      providerWorkStatus: { not: null },
      customerUserId: null,
    },
    data: { customerUserId: userId },
  });
  // Include legacy contracts by the signing account, even if their separately supplied contact email differs.
  await tx.request.updateMany({
    where: {
      providerId,
      providerClientId: null,
      customerUserId: userId,
      contractAcceptedByUserId: userId,
      contractAcceptedAt: { not: null },
    },
    data: { providerClientId: clientId },
  });
  return newlyLinked.map(({ id }) => id);
}

/** Match either a signed-in customer across providers, or one card on a provider write. */
export async function connectVerifiedCustomerWork(
  tx: Prisma.TransactionClient,
  scope: { userId: string } | { clientId: string },
) {
  const filter =
    'userId' in scope
      ? Prisma.sql`customer.id = ${scope.userId}::uuid`
      : Prisma.sql`card.id = ${scope.clientId}::uuid`;
  const cards = await tx.$queryRaw<{ id: string; userId: string }[]>`
    SELECT card.id, customer.id AS "userId"
    FROM "ProviderClient" card
    JOIN "User" customer ON customer.email = card.email
    WHERE ${filter}
      AND customer."accountKind" = 'CUSTOMER' AND customer."emailVerified" IS NOT NULL
      AND card."customerUserId" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "ProviderClient" linked
        WHERE linked."providerId" = card."providerId" AND linked."customerUserId" = customer.id
      )
    ORDER BY card."providerId"
    FOR UPDATE OF card
  `;
  if (!cards.length) return [];

  const customerUserId = cards[0].userId;
  // Keep empty address-book entries private until there is work to share.
  // This statement sees work committed by a writer while we waited for the card lock.
  const connected = await tx.providerClient.updateManyAndReturn({
    where: {
      id: { in: cards.map((card) => card.id) },
      requests: {
        some: { customerUserId: null, providerWorkStatus: { not: null } },
      },
    },
    data: { customerUserId },
    select: { id: true, providerId: true },
  });
  if (!connected.length) return [];
  const requests = await tx.request.updateManyAndReturn({
    where: {
      customerUserId: null,
      providerWorkStatus: { not: null },
      OR: connected.map((card) => ({
        providerId: card.providerId,
        providerClientId: card.id,
      })),
    },
    data: { customerUserId },
    select: { id: true },
  });
  return requests.map((request) => request.id);
}

export async function clientForAcceptedContract(
  tx: Prisma.TransactionClient,
  providerId: string,
  userId: string,
) {
  const linked = await tx.providerClient.findUnique({
    where: {
      providerId_customerUserId: { providerId, customerUserId: userId },
    },
    select: { id: true },
  });
  if (linked) return { clientId: linked.id, changedRequestIds: [] };
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, emailVerified: true, name: true },
  });
  const id = await ensureProviderClient(
    tx,
    providerId,
    user.email.trim().toLowerCase(),
    user.name,
    'CONTRACT',
  );
  const client = await lockProviderClient(tx, providerId, id);
  // Completing a contract is not proof of mailbox ownership for a legacy session.
  if (
    (client.source === 'MANUAL' && !user.emailVerified) ||
    (client.customerUserId && client.customerUserId !== userId)
  ) {
    return { clientId: null, changedRequestIds: [] };
  }
  await tx.providerClient.update({
    where: { id },
    data: {
      customerUserId: userId,
      invitationHash: null,
      invitationExpiresAt: null,
    },
  });
  const changedRequestIds = await attachClientRequests(
    tx,
    providerId,
    id,
    userId,
  );
  return { clientId: id, changedRequestIds };
}

// A session issued before email verification was required may have signed a
// contract while its address still matched an unclaimed, manually added card.
export async function attachLegacySignedClients(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const signed = await tx.request.findMany({
    where: {
      customerUserId: userId,
      contractAcceptedByUserId: userId,
      contractAcceptedAt: { not: null },
      providerId: { not: null },
      providerClientId: null,
    },
    distinct: ['providerId'],
    select: { providerId: true },
    orderBy: { providerId: 'asc' },
  });
  for (const { providerId } of signed) {
    if (providerId) {
      const { clientId } = await clientForAcceptedContract(
        tx,
        providerId,
        userId,
      );
      if (clientId)
        await attachClientRequests(tx, providerId, clientId, userId);
    }
  }
}

import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, value]) => key !== 'operationId' && value != null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => [key, canonical(value)]),
    );
  return value;
}

/** Must run in the SAME transaction as the domain writes. Validate resource access before replay. */
export async function withWriteOperation<T>(
  tx: Prisma.TransactionClient,
  operation: {
    actorUserId: string;
    scope: string;
    key?: string;
    input: unknown;
  },
  write: () => Promise<T>,
): Promise<{ value: T; replayed: boolean }> {
  if (!operation.key) return { value: await write(), replayed: false };
  if (!isUUID(operation.key))
    throw new BadRequestException('Некорректный идентификатор операции');
  const { actorUserId, scope, key } = operation;
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(canonical(operation.input)))
    .digest('hex');
  // PostgreSQL serializes identical intents across processes and simultaneous requests.
  // A rollback releases the lock and leaves neither a receipt nor partial domain writes.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([actorUserId, scope, key])}, 0))`;
  const previous = await tx.writeOperation.findUnique({
    where: { actorUserId_scope_key: { actorUserId, scope, key } },
  });
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new ConflictException(
        'Эта операция уже использована с другими данными. Обновите форму.',
      );
    return { value: previous.result as T, replayed: true };
  }
  const value = await write();
  await tx.writeOperation.create({
    data: {
      actorUserId,
      scope,
      key,
      fingerprint,
      result: JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue,
    },
  });
  return { value, replayed: false };
}

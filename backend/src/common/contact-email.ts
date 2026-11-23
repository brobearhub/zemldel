import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_EMAIL_MESSAGE = 'Укажите корректный email';

// Registration and client-card writes must agree on the owner even before either row exists.
export function lockContactEmail(tx: Prisma.TransactionClient, email: string) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 41482))`;
}

/** Проверяет уже непустую строку email и возвращает нормализованный вид. */
export function assertContactEmail(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
    throw new BadRequestException(INVALID_EMAIL_MESSAGE);
  }
  return trimmed;
}

/**
 * undefined — поле не передано, null или пустая строка — очистить.
 * Невалидное значение отклоняется.
 */
export function normalizeOptionalContactEmail(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(INVALID_EMAIL_MESSAGE);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  return assertContactEmail(trimmed);
}

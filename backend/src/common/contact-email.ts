import { BadRequestException } from '@nestjs/common';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_EMAIL_MESSAGE = 'Укажите корректный email';

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

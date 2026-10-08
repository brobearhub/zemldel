import { BadRequestException } from '@nestjs/common';

const PHONE_CHARS = /^\+?[\d\s()-]+$/;
const INVALID_PHONE_MESSAGE = 'Укажите телефон: от 10 до 15 цифр';

/** Проверяет уже непустую строку телефона и возвращает нормализованный вид. */
export function assertContactPhone(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15 || !PHONE_CHARS.test(trimmed)) {
    throw new BadRequestException(INVALID_PHONE_MESSAGE);
  }
  return trimmed;
}

/**
 * undefined — поле не передано, null или пустая строка — очистить.
 * Невалидное значение отклоняется.
 */
export function normalizeOptionalContactPhone(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(INVALID_PHONE_MESSAGE);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  return assertContactPhone(trimmed);
}

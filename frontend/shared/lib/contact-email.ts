const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INVALID_CONTACT_EMAIL_MESSAGE = "Укажите корректный email";

/** Пустая строка очищает email. Невалидный ввод возвращает текст ошибки. */
export function normalizeContactEmailInput(value: string): { email: string | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) return { email: null, error: null };
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
    return { email: null, error: INVALID_CONTACT_EMAIL_MESSAGE };
  }
  return { email: trimmed, error: null };
}

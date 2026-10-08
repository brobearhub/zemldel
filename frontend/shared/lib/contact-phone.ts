const PHONE_CHARS = /^\+?[\d\s()-]+$/;
export const INVALID_CONTACT_PHONE_MESSAGE = "Укажите телефон: от 10 до 15 цифр";

/** Пустая строка очищает телефон. Невалидный ввод возвращает текст ошибки. */
export function normalizeContactPhoneInput(value: string): { phone: string | null; error: string | null } {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return { phone: null, error: null };
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15 || !PHONE_CHARS.test(trimmed)) {
    return { phone: null, error: INVALID_CONTACT_PHONE_MESSAGE };
  }
  return { phone: trimmed, error: null };
}

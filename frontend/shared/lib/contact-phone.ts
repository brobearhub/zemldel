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

export const RU_PHONE_PREFIX = "+7 ";

/** Маска «+7 900 000-00-00»: префикс подставляется сам, после него не больше 10 цифр. */
export function formatRuPhoneInput(value: string): string {
  const trimmed = value.trim();
  let digits: string;
  if (trimmed.startsWith("+7")) {
    digits = trimmed.slice(2).replace(/\D/g, "");
  } else {
    digits = trimmed.replace(/\D/g, "");
    // Why: вставленный «8 900…» или «7900…» — это код страны, а не часть номера.
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  let result = RU_PHONE_PREFIX + digits.slice(0, 3);
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
  return result;
}

/** Цифры номера после «+7»; пустая строка — номер не введён. */
export function ruPhoneDigits(value: string): string {
  return formatRuPhoneInput(value).slice(RU_PHONE_PREFIX.length).replace(/\D/g, "");
}

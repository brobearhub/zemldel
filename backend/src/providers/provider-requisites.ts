import type { ProviderType } from '../auth/authorization';

export const VERIFICATION_SUPPORT_HINT =
  'Этот ИНН уже подтверждён в другом профиле. Если это ваша организация, напишите в поддержку: info@brobear.ru';

export type VerificationFieldErrors = Partial<
  Record<
    'type' | 'lastName' | 'firstName' | 'legalName' | 'inn' | 'ogrn',
    string
  >
>;

function checksum(digits: number[], coefficients: number[]): number {
  const sum = coefficients.reduce(
    (total, coefficient, index) => total + coefficient * (digits[index] ?? 0),
    0,
  );
  return (sum % 11) % 10;
}

export function isValidInn(value: string): boolean {
  if (!/^\d{10}$|^\d{12}$/.test(value)) return false;
  const digits = value.split('').map(Number);
  if (digits.length === 10) {
    return checksum(digits, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[9];
  }
  return (
    checksum(digits, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[10] &&
    checksum(digits, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[11]
  );
}

/** ОГРН: остаток от деления на 11. ОГРНИП: на 13. Если остаток 10, контрольная цифра 0. */
export function isValidOgrn(value: string, kind: 'OGRN' | 'OGRNIP'): boolean {
  const length = kind === 'OGRN' ? 13 : 15;
  if (!new RegExp(`^\\d{${length}}$`).test(value)) return false;
  const modulus = kind === 'OGRN' ? 11 : 13;
  const remainder = Number(BigInt(value.slice(0, -1)) % BigInt(modulus));
  return remainder % 10 === Number(value[length - 1]);
}

export function collectVerificationFieldErrors(input: {
  type: ProviderType;
  lastName?: string;
  firstName?: string;
  legalName?: string;
  inn?: string;
  ogrn?: string;
}): VerificationFieldErrors {
  if (input.type === 'INDIVIDUAL') {
    return { type: 'Проверка для физлиц появится позже' };
  }

  const errors: VerificationFieldErrors = {};
  const inn = input.inn?.trim() ?? '';
  const ogrn = input.ogrn?.trim() ?? '';

  if (input.type === 'COMPANY') {
    if (!input.legalName?.trim())
      errors.legalName = 'Укажите полное наименование';
    if (!/^\d{10}$/.test(inn)) errors.inn = 'ИНН — 10 цифр';
    else if (!isValidInn(inn))
      errors.inn = 'Проверьте ИНН: контрольная цифра не сходится';
    if (!/^\d{13}$/.test(ogrn)) errors.ogrn = 'ОГРН — 13 цифр';
    else if (!isValidOgrn(ogrn, 'OGRN')) {
      errors.ogrn = 'Проверьте ОГРН: контрольная цифра не сходится';
    }
    return errors;
  }

  if (!input.lastName?.trim()) errors.lastName = 'Укажите фамилию';
  if (!input.firstName?.trim()) errors.firstName = 'Укажите имя';
  if (!/^\d{12}$/.test(inn)) errors.inn = 'ИНН — 12 цифр';
  else if (!isValidInn(inn))
    errors.inn = 'Проверьте ИНН: контрольная цифра не сходится';

  if (input.type === 'SOLE_PROPRIETOR') {
    if (!/^\d{15}$/.test(ogrn)) errors.ogrn = 'ОГРНИП — 15 цифр';
    else if (!isValidOgrn(ogrn, 'OGRNIP')) {
      errors.ogrn = 'Проверьте ОГРНИП: контрольная цифра не сходится';
    }
  }

  return errors;
}

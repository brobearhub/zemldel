import { PROVIDER_TYPES, type ProviderType } from '../auth/authorization';

export type ProviderLegalInput = {
  lastName?: string;
  firstName?: string;
  middleName?: string;
  legalName?: string;
  inn?: string;
  ogrn?: string;
};

export type ProviderContactInput = {
  lastName?: string;
  firstName?: string;
  middleName?: string;
};

export type ProviderFieldErrorKey =
  | 'type'
  | 'cityId'
  | 'lastName'
  | 'firstName'
  | 'legalName'
  | 'inn'
  | 'ogrn'
  | 'contactLastName'
  | 'contactFirstName';

export type ProviderFieldErrors = Partial<
  Record<ProviderFieldErrorKey, string>
>;

const PROVIDER_TYPE_SET = new Set<string>(PROVIDER_TYPES);

export function isProviderType(value: string): value is ProviderType {
  return PROVIDER_TYPE_SET.has(value);
}

export function collectProviderFieldErrors(input: {
  type?: string;
  cityId?: string;
  legal?: ProviderLegalInput;
  contact?: ProviderContactInput;
}): ProviderFieldErrors {
  const errors: ProviderFieldErrors = {};
  if (!input.type || !isProviderType(input.type)) {
    errors.type = 'Выберите тип профиля';
    return errors;
  }

  if (!input.cityId?.trim()) {
    errors.cityId = 'Выберите город';
  }

  const legal = input.legal ?? {};
  if (input.type === 'COMPANY') {
    if (!legal.legalName?.trim())
      errors.legalName = 'Укажите полное наименование';
    if (!/^\d{10}$/.test(legal.inn?.trim() ?? ''))
      errors.inn = 'ИНН организации — 10 цифр';
    if (!/^\d{13}$/.test(legal.ogrn?.trim() ?? ''))
      errors.ogrn = 'ОГРН — 13 цифр';
    const contact = input.contact ?? {};
    if (!contact.lastName?.trim()) errors.contactLastName = 'Укажите фамилию';
    if (!contact.firstName?.trim()) errors.contactFirstName = 'Укажите имя';
    return errors;
  }

  if (!legal.lastName?.trim()) errors.lastName = 'Укажите фамилию';
  if (!legal.firstName?.trim()) errors.firstName = 'Укажите имя';
  if (!/^\d{12}$/.test(legal.inn?.trim() ?? '')) errors.inn = 'ИНН — 12 цифр';
  if (
    input.type === 'SOLE_PROPRIETOR' &&
    !/^\d{15}$/.test(legal.ogrn?.trim() ?? '')
  ) {
    errors.ogrn = 'ОГРНИП — 15 цифр';
  }
  return errors;
}

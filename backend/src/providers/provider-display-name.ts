import type { ProviderType } from '../auth/authorization';

export function formatUserName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`;
}

function initial(name: string): string {
  const trimmed = name.trim();
  const letter = trimmed.charAt(0);
  if (!letter) return '';
  return `${letter.toUpperCase()}.`;
}

/** Имя профиля: физлицо и самозанятый «Имя Фамилия», ИП «ИП Фамилия И. О.», организация — наименование. */
export function formatProviderName(input: {
  type: ProviderType;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  legalName?: string;
}): string {
  if (input.type === 'COMPANY') {
    return (input.legalName ?? '').trim();
  }

  const firstName = (input.firstName ?? '').trim();
  const lastName = (input.lastName ?? '').trim();
  if (input.type === 'SOLE_PROPRIETOR') {
    const initials = [initial(firstName)];
    const middleName = input.middleName?.trim();
    if (middleName) initials.push(initial(middleName));
    return `ИП ${lastName} ${initials.join(' ')}`.trim();
  }

  return formatUserName(firstName, lastName);
}

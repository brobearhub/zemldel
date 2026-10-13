import { describe, expect, it } from 'vitest';
import { collectProviderFieldErrors } from './provider-legal-details';

const person = {
  lastName: 'Петров',
  firstName: 'Иван',
  middleName: 'Сергеевич',
  inn: '123456789012',
};

describe('collectProviderFieldErrors', () => {
  it('пропускает физлицо и самозанятого без отчества и без ОГРН', () => {
    expect(
      collectProviderFieldErrors({
        type: 'INDIVIDUAL',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: { lastName: 'Петров', firstName: 'Иван', inn: '123456789012' },
      }),
    ).toEqual({});
    expect(
      collectProviderFieldErrors({
        type: 'SELF_EMPLOYED',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: person,
      }),
    ).toEqual({});
  });

  it('требует ОГРНИП из 15 цифр у ИП', () => {
    expect(
      collectProviderFieldErrors({
        type: 'SOLE_PROPRIETOR',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: { ...person, ogrn: '123456789012345' },
      }),
    ).toEqual({});
    expect(
      collectProviderFieldErrors({
        type: 'SOLE_PROPRIETOR',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: { ...person, ogrn: '123' },
      }).ogrn,
    ).toBe('ОГРНИП — 15 цифр');
  });

  it('отклоняет ИНН неверной длины', () => {
    expect(
      collectProviderFieldErrors({
        type: 'SELF_EMPLOYED',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: { ...person, inn: '1234567890' },
      }).inn,
    ).toBe('ИНН — 12 цифр');
    expect(
      collectProviderFieldErrors({
        type: 'COMPANY',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: {
          legalName: 'ООО Ромашка',
          inn: '123456789012',
          ogrn: '1234567890123',
        },
        contact: { lastName: 'Петров', firstName: 'Иван' },
      }).inn,
    ).toBe('ИНН организации — 10 цифр');
  });

  it('для организации требует наименование, ОГРН и контакт без отчества', () => {
    expect(
      collectProviderFieldErrors({
        type: 'COMPANY',
        cityId: '11111111-1111-4111-8111-111111111111',
        legal: {
          legalName: 'ООО Ромашка',
          inn: '1234567890',
          ogrn: '1234567890123',
        },
        contact: { lastName: 'Петров', firstName: 'Иван' },
      }),
    ).toEqual({});
    const errors = collectProviderFieldErrors({
      type: 'COMPANY',
      cityId: '11111111-1111-4111-8111-111111111111',
      legal: { legalName: ' ', inn: '1234567890', ogrn: '12' },
      contact: { lastName: ' ', firstName: '' },
    });
    expect(errors.legalName).toBeTruthy();
    expect(errors.ogrn).toBe('ОГРН — 13 цифр');
    expect(errors.contactLastName).toBeTruthy();
    expect(errors.contactFirstName).toBeTruthy();
  });
});

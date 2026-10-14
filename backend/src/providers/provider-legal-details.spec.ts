import { describe, expect, it } from 'vitest';
import { collectProviderFieldErrors } from './provider-legal-details';

const cityId = '11111111-1111-4111-8111-111111111111';

describe('collectProviderFieldErrors', () => {
  it('пропускает физлицо, самозанятого и ИП без реквизитов и без отчества', () => {
    for (const type of [
      'INDIVIDUAL',
      'SELF_EMPLOYED',
      'SOLE_PROPRIETOR',
    ] as const) {
      expect(
        collectProviderFieldErrors({
          type,
          cityId,
          legal: { lastName: 'Петров', firstName: 'Иван' },
        }),
      ).toEqual({});
    }
  });

  it('для организации требует наименование и контакт, но не ИНН и ОГРН', () => {
    expect(
      collectProviderFieldErrors({
        type: 'COMPANY',
        cityId,
        legal: { legalName: 'ООО Ромашка' },
        contact: { lastName: 'Петров', firstName: 'Иван' },
      }),
    ).toEqual({});
    const errors = collectProviderFieldErrors({
      type: 'COMPANY',
      cityId,
      legal: { legalName: ' ' },
      contact: { lastName: ' ', firstName: '' },
    });
    expect(errors.legalName).toBeTruthy();
    expect(errors.inn).toBeUndefined();
    expect(errors.ogrn).toBeUndefined();
    expect(errors.contactLastName).toBeTruthy();
    expect(errors.contactFirstName).toBeTruthy();
  });
});

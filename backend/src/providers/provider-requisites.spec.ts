import { describe, expect, it } from 'vitest';
import {
  collectVerificationFieldErrors,
  isValidInn,
  isValidOgrn,
} from './provider-requisites';

describe('isValidInn', () => {
  it('принимает ИНН из примеров ФНС и отклоняет сдвиг последней цифры', () => {
    expect(isValidInn('6679190271')).toBe(true);
    expect(isValidInn('530401048147')).toBe(true);
    expect(isValidInn('667220294240')).toBe(true);
    expect(isValidInn('6679190272')).toBe(false);
    expect(isValidInn('123')).toBe(false);
  });
});

describe('isValidOgrn', () => {
  it('принимает ОГРН и ОГРНИП из примеров ФНС', () => {
    expect(isValidOgrn('1269600017026', 'OGRN')).toBe(true);
    expect(isValidOgrn('318774600537988', 'OGRNIP')).toBe(true);
    expect(isValidOgrn('1269600017027', 'OGRN')).toBe(false);
    expect(isValidOgrn('318774600537989', 'OGRNIP')).toBe(false);
  });
});

describe('collectVerificationFieldErrors', () => {
  it('физлицу отказывает без создания полей реквизитов', () => {
    expect(collectVerificationFieldErrors({ type: 'INDIVIDUAL' }).type).toBe(
      'Проверка для физлиц появится позже',
    );
  });

  it('самозанятому достаточно ФИО и верного ИНН из 12 цифр', () => {
    expect(
      collectVerificationFieldErrors({
        type: 'SELF_EMPLOYED',
        lastName: 'Усова',
        firstName: 'Вера',
        inn: '667220294240',
      }),
    ).toEqual({});
    expect(
      collectVerificationFieldErrors({
        type: 'SELF_EMPLOYED',
        lastName: 'Усова',
        firstName: 'Вера',
        inn: '667220294241',
      }).inn,
    ).toBe('Проверьте ИНН: контрольная цифра не сходится');
  });
});

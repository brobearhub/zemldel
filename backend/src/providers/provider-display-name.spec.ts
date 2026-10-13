import { describe, expect, it } from 'vitest';
import { formatProviderName, formatUserName } from './provider-display-name';

describe('formatUserName', () => {
  it('собирает имя и фамилию', () => {
    expect(formatUserName('Иван', 'Петров')).toBe('Иван Петров');
  });
});

describe('formatProviderName', () => {
  it('для физлица и самозанятого пишет имя и фамилию', () => {
    expect(
      formatProviderName({
        type: 'INDIVIDUAL',
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: 'Сергеевич',
      }),
    ).toBe('Иван Петров');
    expect(
      formatProviderName({
        type: 'SELF_EMPLOYED',
        firstName: 'Анна',
        lastName: 'Смирнова',
      }),
    ).toBe('Анна Смирнова');
  });

  it('для ИП пишет фамилию и инициалы и опускает пустое отчество', () => {
    expect(
      formatProviderName({
        type: 'SOLE_PROPRIETOR',
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: 'Сергеевич',
      }),
    ).toBe('ИП Петров И. С.');
    expect(
      formatProviderName({
        type: 'SOLE_PROPRIETOR',
        firstName: 'Анна',
        lastName: 'Смирнова',
      }),
    ).toBe('ИП Смирнова А.');
  });

  it('для организации берёт полное наименование', () => {
    expect(
      formatProviderName({
        type: 'COMPANY',
        legalName: 'ООО «Ромашка»',
      }),
    ).toBe('ООО «Ромашка»');
  });
});

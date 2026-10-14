import { describe, expect, it } from 'vitest';
import {
  formatProviderName,
  formatPublicProviderName,
  formatUserName,
} from './provider-display-name';

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

  it('публично показывает физлицо и самозанятого как «Имя Ф.»', () => {
    expect(
      formatPublicProviderName({ type: 'INDIVIDUAL', name: 'Иван Петров' }),
    ).toBe('Иван П.');
    expect(
      formatPublicProviderName({
        type: 'SELF_EMPLOYED',
        name: 'Анна Смирнова',
      }),
    ).toBe('Анна С.');
    expect(
      formatPublicProviderName({
        type: 'SOLE_PROPRIETOR',
        name: 'ИП Петров И. С.',
      }),
    ).toBe('ИП Петров И. С.');
    expect(
      formatPublicProviderName({ type: 'COMPANY', name: 'ООО «Ромашка»' }),
    ).toBe('ООО «Ромашка»');
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

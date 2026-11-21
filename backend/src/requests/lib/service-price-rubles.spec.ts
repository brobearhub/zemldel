import { describe, expect, it } from 'vitest';
import {
  formatRubles,
  parseFixedServicePriceRubles,
  parseServicePriceRubles,
} from './service-price-rubles';

describe('parseServicePriceRubles', () => {
  it('берёт цифры из подписи услуги', () => {
    expect(parseServicePriceRubles('12 000 ₽')).toBe(12000);
    expect(parseServicePriceRubles('от 15 000 ₽')).toBe(15000);
    expect(parseServicePriceRubles('15000')).toBe(15000);
  });

  it('пустую и договорную цену не превращает в сумму', () => {
    expect(parseServicePriceRubles('Договорная')).toBeNull();
    expect(parseServicePriceRubles('')).toBeNull();
    expect(parseServicePriceRubles(null)).toBeNull();
  });

  it('не выходит за границы целого числа в базе', () => {
    expect(parseServicePriceRubles('2147483647')).toBe(2147483647);
    expect(parseServicePriceRubles('2147483648')).toBeNull();
  });
});

describe('parseFixedServicePriceRubles', () => {
  it.each(['15000', '15 000 ₽', '15\u00a0000 ₽', '15\u202f000 ₽'])(
    'recognizes a fixed price %s',
    (price) => {
      expect(parseFixedServicePriceRubles(price)).toBe(15000);
    },
  );

  it.each([
    'от 15 000 ₽',
    '10 000–20 000 ₽',
    '100,50 ₽',
    'Договорная',
    '0',
    '2147483648',
    '',
  ])('does not treat ambiguous or invalid price %s as fixed', (price) => {
    expect(parseFixedServicePriceRubles(price)).toBeNull();
  });
});

describe('formatRubles', () => {
  it('форматирует рубли', () => {
    expect(formatRubles(12000)).toMatch(/12[\s\u00a0\u202f]?000/);
    expect(formatRubles(12000)).toContain('₽');
  });
});

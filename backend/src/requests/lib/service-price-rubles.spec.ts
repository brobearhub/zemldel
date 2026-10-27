import { describe, expect, it } from 'vitest';
import { formatRubles, parseServicePriceRubles } from './service-price-rubles';

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
});

describe('formatRubles', () => {
  it('форматирует рубли', () => {
    expect(formatRubles(12000)).toMatch(/12[\s\u00a0\u202f]?000/);
    expect(formatRubles(12000)).toContain('₽');
  });
});

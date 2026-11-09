import { describe, expect, it } from 'vitest';
import { createPlanProducts } from './billing-catalog';

describe('configured billing prices', () => {
  it('converts rubles to kopecks and derives discounted annual prices', () => {
    const catalog = createPlanProducts({
      BILLING_LITE_MONTHLY_PRICE_RUB: '12.34',
      BILLING_BUSINESS_MONTHLY_PRICE_RUB: '20',
    });
    expect(catalog.LITE.amount).toBe(1234);
    expect(catalog.BUSINESS.amount).toBe(2000);
    expect(catalog.LITE_YEAR.amount).toBe(13327);
    expect(catalog.BUSINESS_YEAR.amount).toBe(21600);
  });

  it.each(['', '0', '-7', '7.001', '7,50', 'NaN', '1e3', '999999999999999'])(
    'rejects an invalid configured price: %s',
    (value) => {
      expect(() =>
        createPlanProducts({ BILLING_LITE_MONTHLY_PRICE_RUB: value }),
      ).toThrow('BILLING_LITE_MONTHLY_PRICE_RUB');
    },
  );

  it('rejects Business below Lite to keep upgrade amounts nonnegative', () => {
    expect(() =>
      createPlanProducts({
        BILLING_LITE_MONTHLY_PRICE_RUB: '20',
        BILLING_BUSINESS_MONTHLY_PRICE_RUB: '10',
      }),
    ).toThrow('Business price must not be lower than Lite price');
  });
});

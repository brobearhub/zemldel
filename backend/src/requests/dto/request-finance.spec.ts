import { describe, expect, it } from 'vitest';
import { remainingRubles, sumPaidRubles, sumPaidRublesByType } from './request-finance';

describe('request finance', () => {
  it('sums payments and remaining', () => {
    expect(sumPaidRubles([{ amountRubles: 5_000 }, { amountRubles: 5_000 }])).toBe(10_000);
    expect(
      sumPaidRublesByType(
        [
          { type: 'CONTRACT', amountRubles: 5_000, paidAt: new Date('2026-08-13T00:00:00.000Z') },
          { type: 'CONTRACT', amountRubles: 5_000, paidAt: null },
          { type: 'OTHER', amountRubles: 5_000, paidAt: new Date('2026-08-13T00:00:00.000Z') },
        ],
        'CONTRACT',
      ),
    ).toBe(5_000);
    expect(remainingRubles(25_000, 10_000)).toBe(15_000);
    expect(remainingRubles(null, 10_000)).toBeNull();
  });
});

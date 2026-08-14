import { describe, expect, it } from 'vitest';
import {
  canCompleteWithFinance,
  remainingKopecks,
  sumPaidKopecks,
  sumPaidKopecksByType,
} from './request-finance';

describe('request finance', () => {
  it('sums payments and remaining', () => {
    expect(sumPaidKopecks([{ amountKopecks: 500_000 }, { amountKopecks: 500_000 }])).toBe(
      1_000_000,
    );
    expect(
      sumPaidKopecksByType(
        [
          { type: 'CONTRACT', amountKopecks: 500_000, paidAt: new Date('2026-08-13T00:00:00.000Z') },
          { type: 'CONTRACT', amountKopecks: 500_000, paidAt: null },
          { type: 'OTHER', amountKopecks: 500_000, paidAt: new Date('2026-08-13T00:00:00.000Z') },
        ],
        'CONTRACT',
      ),
    ).toBe(500_000);
    expect(remainingKopecks(2_500_000, 1_000_000)).toBe(1_500_000);
    expect(remainingKopecks(null, 1_000_000)).toBeNull();
  });

  it('blocks complete only when price is set and remaining is positive', () => {
    expect(canCompleteWithFinance({ status: 'ACCEPTED', remainingAmountKopecks: null })).toBe(
      true,
    );
    expect(canCompleteWithFinance({ status: 'ACCEPTED', remainingAmountKopecks: 0 })).toBe(true);
    expect(canCompleteWithFinance({ status: 'ACCEPTED', remainingAmountKopecks: -1 })).toBe(true);
    expect(canCompleteWithFinance({ status: 'ACCEPTED', remainingAmountKopecks: 1 })).toBe(false);
    expect(canCompleteWithFinance({ status: 'ACTIVE', remainingAmountKopecks: 0 })).toBe(false);
  });
});

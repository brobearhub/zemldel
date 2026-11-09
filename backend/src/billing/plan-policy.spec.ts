import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  effectivePlan,
  entitlementPlan,
  localDay,
  nextMidnight,
  upgradeAmount,
  purchaseMode,
  PLAN_LIMITS,
} from './plan-policy';
import { PLAN_PRODUCTS, addCalendarMonths } from './billing-catalog';
import { publicServiceForPlan } from './service-plan';
import type { ServiceDbRow } from '../services/dto/service.dto';

describe('plan policy', () => {
  beforeEach(() => vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1'));
  afterEach(() => vi.unstubAllEnvs());

  it('pauses entitlements for Standard and restores them with one switch', () => {
    const standard = {
      plan: 'STANDARD',
      planExpiresAt: null,
      graceUntil: null,
    };
    const row = {
      image: 'one',
      images: ['one', 'two'],
      stockBadge: 'Скидка',
      paletteColor: 'error',
      allRussia: true,
      cities: [],
      regions: [],
      provider: { city: null },
    } as unknown as ServiceDbRow & { allRussia: boolean };
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '0');
    expect(effectivePlan(standard)).toBe('STANDARD');
    expect(entitlementPlan(standard)).toBe('BUSINESS');
    expect(publicServiceForPlan(row, standard)).toMatchObject({
      allRussia: true,
      images: ['one', 'two'],
      stockBadge: 'Скидка',
      paletteColor: 'error',
    });
    vi.stubEnv('PLAN_ENFORCEMENT_ENABLED', '1');
    expect(entitlementPlan(standard)).toBe('STANDARD');
    expect(publicServiceForPlan(row, standard)).toMatchObject({
      allRussia: true,
      images: ['one'],
      stockBadge: null,
    });
  });
  it('defaults existing profiles to Standard and observes exact expiration and grace', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    expect(effectivePlan(null, now)).toBe('STANDARD');
    expect(effectivePlan({ plan: 'BUSINESS', planExpiresAt: now }, now)).toBe(
      'STANDARD',
    );
    expect(
      effectivePlan(
        {
          plan: 'BUSINESS',
          planExpiresAt: now,
          graceUntil: new Date(now.getTime() + 1),
        },
        now,
      ),
    ).toBe('BUSINESS');
    expect(PLAN_LIMITS.LITE.replies).toBeNull();
  });
  it('calculates remaining Lite value in kopecks without charging client-supplied prices', () => {
    const account = {
      plan: 'LITE',
      planStartedAt: new Date('2026-11-01T00:00:00Z'),
      planExpiresAt: new Date('2026-12-01T00:00:00Z'),
    };
    expect(
      upgradeAmount(account, 'BUSINESS', new Date('2026-11-16T00:00:00Z')),
    ).toBe(550);
    expect(
      upgradeAmount(account, 'BUSINESS', new Date('2026-12-01T00:00:00Z')),
    ).toBe(900);
  });
  it('prices annual plans at exactly 90% of twelve months', () => {
    expect(PLAN_PRODUCTS.LITE_YEAR.amount).toBe(700 * 12 * 0.9);
    expect(PLAN_PRODUCTS.BUSINESS_YEAR.amount).toBe(900 * 12 * 0.9);
    expect(
      addCalendarMonths(new Date('2028-02-29T09:15:00Z'), 12).toISOString(),
    ).toBe('2029-02-28T09:15:00.000Z');
  });
  it('credits a monthly balance on annual conversion and an annual balance on upgrade', () => {
    const account = {
      plan: 'LITE',
      billingPeriod: 'MONTH',
      planStartedAt: new Date('2026-11-01T00:00:00Z'),
      planExpiresAt: new Date('2026-12-01T00:00:00Z'),
    };
    const now = new Date('2026-11-16T00:00:00Z');
    expect(upgradeAmount(account, 'LITE_YEAR', now)).toBe(7560 - 350);
    expect(upgradeAmount(account, 'BUSINESS_YEAR', now)).toBe(9720 - 350);
    expect(
      upgradeAmount(
        { ...account, billingPeriod: 'YEAR' },
        'BUSINESS_YEAR',
        now,
      ),
    ).toBe(9720 - 3780);
  });
  it('defers shortening the period or downgrading without producing a negative charge', () => {
    const account = {
      plan: 'LITE',
      billingPeriod: 'YEAR',
      planStartedAt: new Date('2026-11-01T00:00:00Z'),
      planExpiresAt: new Date('2027-11-01T00:00:00Z'),
    };
    const now = new Date('2026-11-02T00:00:00Z');
    expect(purchaseMode(account, 'BUSINESS', now)).toBe('schedule');
    expect(upgradeAmount(account, 'BUSINESS', now)).toBe(900);
    expect(purchaseMode(account, 'LITE_YEAR', now)).toBe('current');
    expect(
      purchaseMode({ ...account, plan: 'BUSINESS' }, 'LITE_YEAR', now),
    ).toBe('schedule');
    expect(purchaseMode(account, 'LITE', new Date('2027-11-02'))).toBe(
      'purchase',
    );
  });
  it.each([
    'Europe/Moscow',
    'Asia/Yekaterinburg',
    'Asia/Kathmandu',
    'America/New_York',
  ])('finds midnight in %s', (timezone) => {
    const now = new Date('2026-11-01T04:15:00Z');
    const next = nextMidnight(now, timezone);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
    expect(localDay(new Date(next.getTime() - 1000), timezone)).toBe(
      localDay(now, timezone),
    );
    expect(localDay(next, timezone)).not.toBe(localDay(now, timezone));
  });
  const row = {
    image: 'one',
    images: ['one', 'two', 'three', 'four'],
    stockBadge: 'Скидка',
    paletteColor: 'error',
    regionOrder: ['B', 'A', 'C', 'D'],
    cities: [{ city: { id: 'cityA', regionCode: 'A' } }],
    regions: ['A', 'B', 'C', 'D'].map((regionCode) => ({
      regionCode,
      regionName: regionCode,
    })),
    provider: { city: { regionCode: 'HOME', regionName: 'Home' } },
  } as unknown as ServiceDbRow & { regionOrder: string[]; allRussia?: boolean };
  it('hides surplus data without mutating the saved original', () => {
    const standard = publicServiceForPlan(row)!;
    expect(standard.images).toEqual(['one']);
    expect(standard.stockBadge).toBeNull();
    expect(standard.regions).toEqual(row.regions);
    expect(standard.cities).toEqual(row.cities);
    const lite = publicServiceForPlan(row, {
      plan: 'LITE',
      planExpiresAt: new Date(Date.now() + 100000),
      graceUntil: null,
    })!;
    expect(lite.images).toHaveLength(3);
    expect(lite.paletteColor).toBe('primary');
    expect(row.images).toHaveLength(4);
    expect(row.paletteColor).toBe('error');
    expect(row.regions).toHaveLength(4);
  });
  it('preserves nationwide coverage for Standard without a home city', () => {
    const national = {
      ...row,
      allRussia: true,
      cities: [],
      regions: [],
      provider: { ...row.provider, city: null },
    };
    expect(publicServiceForPlan(national)).toMatchObject({
      allRussia: true,
      cities: [],
      regions: [],
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  effectivePlan,
  localDay,
  nextMidnight,
  upgradeAmount,
  PLAN_LIMITS,
} from './plan-policy';
import { publicServiceForPlan } from './service-plan';
import type { ServiceDbRow } from '../services/dto/service.dto';

describe('plan policy', () => {
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
    expect(PLAN_LIMITS.LITE.replies).toBe(10);
  });
  it('calculates remaining Lite value in kopecks without charging client-supplied prices', () => {
    const account = {
      plan: 'LITE',
      planStartedAt: new Date('2026-11-01T00:00:00Z'),
      planExpiresAt: new Date('2026-12-01T00:00:00Z'),
    };
    expect(
      upgradeAmount(account, 'BUSINESS', new Date('2026-11-16T00:00:00Z')),
    ).toBe(84950);
    expect(
      upgradeAmount(account, 'BUSINESS', new Date('2026-12-01T00:00:00Z')),
    ).toBe(99900);
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
    expect(standard.regions.map((r) => r.regionCode)).toEqual(['B']);
    expect(standard.cities).toEqual([]);
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
  it('replaces nationwide coverage with home region or hides publication', () => {
    const national = { ...row, allRussia: true, cities: [], regions: [] };
    expect(publicServiceForPlan(national)?.regions[0].regionCode).toBe('HOME');
    expect(
      publicServiceForPlan({
        ...national,
        provider: { ...row.provider, city: null },
      }),
    ).toBeNull();
  });
});

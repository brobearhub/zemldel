import type { BillingTestAccount } from '@prisma/client';
import type { ServiceDbRow } from '../services/dto/service.dto';
import { effectivePlan, PLAN_LIMITS } from './plan-policy';

export function publicServiceForPlan<
  T extends ServiceDbRow & { allRussia?: boolean; regionOrder?: string[] },
>(
  row: T,
  account?:
    | (Pick<BillingTestAccount, 'plan' | 'planExpiresAt' | 'graceUntil'> & {
        autoRenew?: boolean;
      })
    | null,
): T | null {
  const plan = effectivePlan(account);
  const limits = PLAN_LIMITS[plan];
  let cities = row.cities,
    regions = row.regions;
  const allRussia = Boolean(row.allRussia && plan === 'BUSINESS');
  if (row.allRussia && !allRussia && !cities.length && !regions.length) {
    if (!row.provider.city) return null;
    regions = [
      {
        regionCode: row.provider.city.regionCode,
        regionName: row.provider.city.regionName,
      },
    ];
  }
  const available = [
    ...new Set([
      ...cities.map((c) => c.city.regionCode),
      ...regions.map((r) => r.regionCode),
    ]),
  ];
  const ordered = [
    ...new Set([
      ...(row.regionOrder ?? []).filter((code) => available.includes(code)),
      ...available,
    ]),
  ];
  const allowed = new Set(
    limits.regions === null ? ordered : ordered.slice(0, limits.regions),
  );
  cities = cities.filter((c) => allowed.has(c.city.regionCode));
  regions = regions.filter((r) => allowed.has(r.regionCode));
  const images = (
    row.images?.length ? row.images : row.image ? [row.image] : []
  ).slice(0, limits.photos);
  return {
    ...row,
    allRussia,
    cities,
    regions,
    images,
    image: images[0] ?? null,
    stockBadge: plan === 'STANDARD' ? null : row.stockBadge,
    paletteColor:
      plan === 'STANDARD'
        ? null
        : plan === 'LITE'
          ? 'primary'
          : row.paletteColor,
  };
}

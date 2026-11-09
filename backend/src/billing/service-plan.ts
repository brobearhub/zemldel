import type { BillingAccount } from '@prisma/client';
import type { ServiceDbRow } from '../services/dto/service.dto';
import { entitlementPlan, PLAN_LIMITS } from './plan-policy';

export function publicServiceForPlan<
  T extends ServiceDbRow & { allRussia?: boolean; regionOrder?: string[] },
>(
  row: T,
  account?:
    | (Pick<BillingAccount, 'plan' | 'planExpiresAt' | 'graceUntil'> & {
        autoRenew?: boolean;
      })
    | null,
): T | null {
  const plan = entitlementPlan(account);
  const limits = PLAN_LIMITS[plan];
  const images = (
    row.images?.length ? row.images : row.image ? [row.image] : []
  ).slice(0, limits.photos);
  return {
    ...row,
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

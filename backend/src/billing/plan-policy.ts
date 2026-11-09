import type { BillingAccount } from '@prisma/client';
import {
  BILLING_PRODUCTS,
  PLAN_PRODUCTS,
  isPlanProduct,
  planProduct,
  type PlanProduct,
} from './billing-catalog';

export type Plan = 'STANDARD' | 'LITE' | 'BUSINESS';
// Explicit zero is an emergency override; tariff enforcement is on by default.
export function planEnforcementEnabled() {
  return process.env.PLAN_ENFORCEMENT_ENABLED !== '0';
}
export const PLAN_LIMITS = {
  STANDARD: {
    photos: 1,
    regions: null,
    replies: null,
    templates: true,
    sharedTemplates: true,
    team: true,
    statistics: 0,
  },
  LITE: {
    photos: 3,
    regions: null,
    replies: null,
    templates: true,
    sharedTemplates: true,
    team: true,
    statistics: 1,
  },
  BUSINESS: {
    photos: 10,
    regions: null,
    replies: null,
    templates: true,
    sharedTemplates: true,
    team: true,
    statistics: 2,
  },
} as const;

export function effectivePlan(
  account:
    | (Pick<BillingAccount, 'plan' | 'planExpiresAt'> & {
        graceUntil?: Date | null;
        autoRenew?: boolean;
      })
    | null
    | undefined,
  now = new Date(),
): Plan {
  if (!account || !['LITE', 'BUSINESS'].includes(account.plan))
    return 'STANDARD';
  if (
    (account.planExpiresAt && account.planExpiresAt > now) ||
    (account.graceUntil && account.graceUntil > now)
  )
    return account.plan as Plan;
  if (
    account.autoRenew &&
    account.planExpiresAt &&
    now.getTime() < account.planExpiresAt.getTime() + 72 * 3600000
  )
    return account.plan as Plan;
  return 'STANDARD';
}

export function entitlementPlan(
  account: Parameters<typeof effectivePlan>[0],
  now = new Date(),
): Plan {
  return planEnforcementEnabled() ? effectivePlan(account, now) : 'BUSINESS';
}

export function localDay(now: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Find the next local midnight, including DST and non-integer timezone offsets.
export function nextMidnight(now: Date, timezone: string) {
  const day = localDay(now, timezone);
  let low = now.getTime(),
    high = low + 27 * 3600000;
  while (high - low > 1) {
    const mid = Math.floor((high + low) / 2);
    if (localDay(new Date(mid), timezone) === day) low = mid;
    else high = mid;
  }
  return new Date(high);
}

type PaidAccount = Pick<
  BillingAccount,
  'plan' | 'planExpiresAt' | 'planStartedAt'
> & {
  billingPeriod?: string;
};

export function purchaseMode(
  account: PaidAccount | null,
  product: PlanProduct,
  now = new Date(),
) {
  const selected = PLAN_PRODUCTS[product];
  if (
    !account?.planExpiresAt ||
    account.planExpiresAt <= now ||
    !planProduct(account.plan)
  )
    return 'purchase';
  const period = account.billingPeriod ?? 'MONTH';
  if (account.plan === selected.plan && period === selected.period)
    return 'current';
  if (
    (account.plan === 'BUSINESS' && selected.plan === 'LITE') ||
    (period === 'YEAR' && selected.period === 'MONTH')
  )
    return 'schedule';
  return 'purchase';
}

export function upgradeAmount(
  account: PaidAccount | null,
  product: string,
  now = new Date(),
) {
  if (!isPlanProduct(product)) {
    if (product === 'REPLIES_10') return BILLING_PRODUCTS.REPLIES_10.amount;
    throw new Error('Unknown billing product');
  }
  const price = PLAN_PRODUCTS[product].amount;
  const current = account && planProduct(account.plan, account.billingPeriod);
  if (
    !account ||
    !current ||
    !account.planStartedAt ||
    !account.planExpiresAt ||
    account.planExpiresAt <= now ||
    purchaseMode(account, product, now) !== 'purchase'
  )
    return price;
  const duration =
    account.planExpiresAt.getTime() - account.planStartedAt.getTime();
  const fraction =
    duration > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (account.planExpiresAt.getTime() - now.getTime()) / duration,
          ),
        )
      : 0;
  return price - Math.floor(PLAN_PRODUCTS[current].amount * fraction);
}

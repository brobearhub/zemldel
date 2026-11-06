import type { BillingTestAccount } from '@prisma/client';

export type Plan = 'STANDARD' | 'LITE' | 'BUSINESS';
export const PLAN_LIMITS = {
  STANDARD: {
    photos: 1,
    regions: 1,
    replies: 5,
    templates: false,
    sharedTemplates: false,
    team: false,
    statistics: 0,
  },
  LITE: {
    photos: 3,
    regions: 3,
    replies: 10,
    templates: true,
    sharedTemplates: false,
    team: false,
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
    | (Pick<BillingTestAccount, 'plan' | 'planExpiresAt'> & {
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

export function upgradeAmount(
  account: Pick<
    BillingTestAccount,
    'plan' | 'planExpiresAt' | 'planStartedAt'
  > | null,
  product: string,
  now = new Date(),
) {
  if (
    product !== 'BUSINESS' ||
    account?.plan !== 'LITE' ||
    !account.planStartedAt ||
    !account.planExpiresAt ||
    account.planExpiresAt <= now
  )
    return product === 'BUSINESS' ? 99900 : product === 'LITE' ? 29900 : 9900;
  const duration =
    account.planExpiresAt.getTime() - account.planStartedAt.getTime();
  const fraction =
    duration > 0
      ? Math.min(
          1,
          (account.planExpiresAt.getTime() - now.getTime()) / duration,
        )
      : 0;
  return 99900 - Math.floor(29900 * fraction);
}

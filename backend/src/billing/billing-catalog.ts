export type BillingPeriod = 'MONTH' | 'YEAR';
function monthlyPrice(env: NodeJS.ProcessEnv, name: string, fallback: string) {
  const value = (env[name] ?? fallback).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error(
      `${name} must be a positive ruble amount with at most two decimal places`,
    );
  const [rubles, kopecks = ''] = value.split('.');
  const amount = Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
  if (amount <= 0 || !Number.isSafeInteger(amount * 108))
    throw new Error(`${name} is outside the supported price range`);
  return amount;
}

export function createPlanProducts(env: NodeJS.ProcessEnv = process.env) {
  const lite = monthlyPrice(env, 'BILLING_LITE_MONTHLY_PRICE_RUB', '7');
  const business = monthlyPrice(env, 'BILLING_BUSINESS_MONTHLY_PRICE_RUB', '9');
  if (business < lite)
    throw new Error('Business price must not be lower than Lite price');
  return {
    LITE: {
      plan: 'LITE',
      period: 'MONTH',
      months: 1,
      amount: lite,
      title: 'Земледел: Лайт на месяц',
    },
    BUSINESS: {
      plan: 'BUSINESS',
      period: 'MONTH',
      months: 1,
      amount: business,
      title: 'Земледел: Бизнес на месяц',
    },
    LITE_YEAR: {
      plan: 'LITE',
      period: 'YEAR',
      months: 12,
      amount: Math.round((lite * 108) / 10),
      title: 'Земледел: Лайт на год, скидка 10%',
    },
    BUSINESS_YEAR: {
      plan: 'BUSINESS',
      period: 'YEAR',
      months: 12,
      amount: Math.round((business * 108) / 10),
      title: 'Земледел: Бизнес на год, скидка 10%',
    },
  } as const;
}

export const PLAN_PRODUCTS = createPlanProducts();
export type PlanProduct = keyof typeof PLAN_PRODUCTS;
export const BILLING_PRODUCTS = {
  ...PLAN_PRODUCTS,
  PROVIDER_SLUG_CHANGE: {
    amount: 100000,
    title: 'Земледел: смена адреса профиля',
  },
  // Retained to reconcile historical orders; new purchases are disabled.
  REPLIES_10: { amount: 9900, title: 'Земледел: 10 дополнительных откликов' },
} as const;
export type BillingProduct = keyof typeof BILLING_PRODUCTS;

export function isPlanProduct(product: string): product is PlanProduct {
  return Object.hasOwn(PLAN_PRODUCTS, product);
}

export function planProduct(
  plan: string,
  period: string = 'MONTH',
): PlanProduct | null {
  if (plan !== 'LITE' && plan !== 'BUSINESS') return null;
  return period === 'YEAR' ? `${plan}_YEAR` : plan;
}

export function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function addCalendarMonth(date: Date) {
  return addCalendarMonths(date, 1);
}

export const CLOSED_STATUSES = [
  'CONFIRMED',
  'REJECTED',
  'CANCELED',
  'DEADLINE_EXPIRED',
  'AUTH_FAIL',
  'REVERSED',
  'REFUNDED',
  'PARTIAL_REFUNDED',
  'INIT_FAILED',
];
export const REFUND_STATUSES = ['REFUNDED', 'PARTIAL_REFUNDED', 'REVERSED'];

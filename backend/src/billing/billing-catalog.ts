export const BILLING_PRODUCTS = {
  LITE: { amount: 29900, title: 'Земледел: Лайт на месяц' },
  BUSINESS: { amount: 99900, title: 'Земледел: Бизнес на месяц' },
  REPLIES_10: { amount: 9900, title: 'Земледел: 10 дополнительных откликов' },
} as const;
export type BillingProduct = keyof typeof BILLING_PRODUCTS;

export function addCalendarMonth(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
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

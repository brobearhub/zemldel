import type { BillingConsent } from '@prisma/client';
import { PLAN_PRODUCTS, type PlanProduct } from './billing-catalog';
import { PLAN_LIMITS } from './plan-policy';
import { STORY_PLAN_LIMITS } from '../stories/story-plan';

export function purchaseSnapshot(
  product: PlanProduct,
  amount: number,
  autoRenew: boolean,
) {
  const selected = PLAN_PRODUCTS[product];
  return {
    product,
    amount,
    regularAmount: selected.amount,
    plan: selected.plan,
    billingPeriod: selected.period,
    months: selected.months,
    autoRenew,
    limits: PLAN_LIMITS[selected.plan],
    stories: STORY_PLAN_LIMITS[selected.plan],
  };
}

export function permitsRenewal(
  consent: Pick<BillingConsent, 'offerVersion' | 'snapshot'> | null,
  product: PlanProduct,
  offerVersion: string,
) {
  const snapshot = consent?.snapshot;
  return Boolean(
    consent?.offerVersion === offerVersion &&
    snapshot &&
    typeof snapshot === 'object' &&
    !Array.isArray(snapshot) &&
    snapshot.autoRenew === true &&
    snapshot.product === product &&
    snapshot.regularAmount === PLAN_PRODUCTS[product].amount,
  );
}

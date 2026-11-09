-- Rename the existing ledger in place; preserve subscriptions and payment history.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "BillingTestAccount" RENAME TO "BillingAccount";
ALTER TABLE "BillingTestOrder" RENAME TO "BillingOrder";

ALTER TABLE "BillingAccount" RENAME CONSTRAINT "BillingTestAccount_pkey" TO "BillingAccount_pkey";
ALTER TABLE "BillingAccount" RENAME CONSTRAINT "BillingTestAccount_providerId_fkey" TO "BillingAccount_providerId_fkey";
ALTER TABLE "BillingAccount" RENAME CONSTRAINT "BillingTestAccount_replyCredits_check" TO "BillingAccount_replyCredits_check";
ALTER TABLE "BillingAccount" RENAME CONSTRAINT "BillingTestAccount_billingPeriod_check" TO "BillingAccount_billingPeriod_check";
ALTER TABLE "BillingAccount" RENAME CONSTRAINT "BillingTestAccount_nextBillingPeriod_check" TO "BillingAccount_nextBillingPeriod_check";

ALTER TABLE "BillingOrder" RENAME CONSTRAINT "BillingTestOrder_pkey" TO "BillingOrder_pkey";
ALTER TABLE "BillingOrder" RENAME CONSTRAINT "BillingTestOrder_providerId_fkey" TO "BillingOrder_providerId_fkey";
ALTER TABLE "BillingOrder" RENAME CONSTRAINT "BillingTestOrder_amount_check" TO "BillingOrder_amount_check";
ALTER INDEX "BillingTestOrder_paymentId_key" RENAME TO "BillingOrder_paymentId_key";
ALTER INDEX "BillingTestOrder_providerId_operationId_key" RENAME TO "BillingOrder_providerId_operationId_key";
ALTER INDEX "BillingTestOrder_providerId_createdAt_idx" RENAME TO "BillingOrder_providerId_createdAt_idx";
ALTER INDEX "BillingTestOrder_providerId_renewalCycle_renewalAttempt_key" RENAME TO "BillingOrder_providerId_renewalCycle_renewalAttempt_key";
COMMIT;

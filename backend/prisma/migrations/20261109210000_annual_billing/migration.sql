ALTER TABLE "BillingTestAccount"
  ADD COLUMN "billingPeriod" TEXT NOT NULL DEFAULT 'MONTH',
  ADD COLUMN "nextBillingPeriod" TEXT;

ALTER TABLE "BillingTestAccount"
  ADD CONSTRAINT "BillingTestAccount_billingPeriod_check"
    CHECK ("billingPeriod" IN ('MONTH', 'YEAR')),
  ADD CONSTRAINT "BillingTestAccount_nextBillingPeriod_check"
    CHECK ("nextBillingPeriod" IS NULL OR "nextBillingPeriod" IN ('MONTH', 'YEAR'));

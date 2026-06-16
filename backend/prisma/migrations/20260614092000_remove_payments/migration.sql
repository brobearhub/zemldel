-- Remove payments from Request flow
-- 1) Backfill Request statuses away from removed enum values
UPDATE "Request"
SET "status" = 'CONTRACT_ACCEPTED'
WHERE "status" IN ('PAYMENT_PENDING', 'PAYMENT_PROCESSING');

UPDATE "Request"
SET "status" = 'ACCEPTED'
WHERE "status" = 'PAID';

-- 2) Drop Payment table and related enums
DROP TABLE IF EXISTS "Payment";
DROP TYPE IF EXISTS "PaymentType";
DROP TYPE IF EXISTS "PaymentStatus";

-- 3) Recreate RequestStatus enum without payment-related values
ALTER TABLE "Request" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";

CREATE TYPE "RequestStatus" AS ENUM (
  'NEW',
  'DISCUSSING',
  'TERMS_AGREED',
  'PROVIDER_SELECTED',
  'CONTRACT_ACCEPTED',
  'LOCKED',
  'ACTIVE',
  'SERVICE_RENDERED',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED'
);

ALTER TABLE "Request"
ALTER COLUMN "status" TYPE "RequestStatus"
USING ("status"::text::"RequestStatus");

ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'NEW';

DROP TYPE "RequestStatus_old";


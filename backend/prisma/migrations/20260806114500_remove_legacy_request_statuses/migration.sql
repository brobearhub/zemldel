-- Remove legacy RequestStatus values: PROVIDER_SELECTED, CONTRACT_ACCEPTED, SERVICE_RENDERED, LOCKED
-- Exclusivity moves to lockedAt; PROVIDER_SELECTED rows become DISCUSSING with lockedAt set.

-- 1) Data backfill before enum shrink
UPDATE "Request"
SET
  "lockedAt" = COALESCE("lockedAt", "updatedAt"),
  "status" = 'DISCUSSING'
WHERE "status" = 'PROVIDER_SELECTED';

UPDATE "Request"
SET "status" = 'ACTIVE'
WHERE "status" = 'CONTRACT_ACCEPTED';

UPDATE "Request"
SET
  "status" = 'ACCEPTANCE_PENDING',
  "acceptanceRequestedAt" = COALESCE("acceptanceRequestedAt", "updatedAt"),
  "autoAcceptAt" = COALESCE(
    "autoAcceptAt",
    COALESCE("acceptanceRequestedAt", "updatedAt") + INTERVAL '7 days'
  )
WHERE "status" = 'SERVICE_RENDERED';

UPDATE "Request"
SET "status" = CASE
  WHEN "providerId" IS NOT NULL THEN 'ACTIVE'::"RequestStatus"
  ELSE 'DISCUSSING'::"RequestStatus"
END
WHERE "status" = 'LOCKED';

-- 2) Recreate enum
ALTER TABLE "Request" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";

CREATE TYPE "RequestStatus" AS ENUM (
  'NEW',
  'DISCUSSING',
  'TERMS_AGREED',
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED'
);

ALTER TABLE "Request"
ALTER COLUMN "status" TYPE "RequestStatus"
USING ("status"::text::"RequestStatus");

ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'NEW'::"RequestStatus";

DROP TYPE "RequestStatus_old";

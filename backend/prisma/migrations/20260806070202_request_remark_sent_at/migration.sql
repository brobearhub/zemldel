-- AlterTable
ALTER TABLE "RequestRemark" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- Backfill: legacy remarks were effectively visible to both sides.
UPDATE "RequestRemark"
SET "sentAt" = "createdAt"
WHERE "sentAt" IS NULL;

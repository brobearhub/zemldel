-- CreateEnum
CREATE TYPE "RequestContractFileRole" AS ENUM ('CONTRACT_DOCUMENT', 'CONTRACT_SIGNATURE', 'PROVIDER_MISC');

-- AlterTable
ALTER TABLE "RequestContractFile"
ADD COLUMN     "role" "RequestContractFileRole" NOT NULL DEFAULT 'CONTRACT_DOCUMENT',
ADD COLUMN     "bundleId" UUID;

-- Backfill existing rows: treat as contract documents
UPDATE "RequestContractFile"
SET "bundleId" = "id",
    "role" = 'CONTRACT_DOCUMENT'
WHERE "bundleId" IS NULL;

-- CreateIndex
CREATE INDEX "RequestContractFile_bundleId_updatedAt_idx" ON "RequestContractFile"("bundleId", "updatedAt");


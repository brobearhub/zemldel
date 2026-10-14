-- CreateEnum
CREATE TYPE "ProviderVerificationStatus" AS ENUM ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderVerificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FnsCheckStatus" AS ENUM ('FOUND_ACTIVE', 'FOUND_TERMINATED', 'NOT_FOUND', 'MISMATCH', 'UNAVAILABLE', 'NOT_SUPPORTED');

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "verificationRejectReason" TEXT,
ADD COLUMN     "verificationStatus" "ProviderVerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedInn" TEXT;

-- Один подтверждённый ИНН на все профили. Пустой verifiedInn у непроверенных в индекс не входит.
CREATE UNIQUE INDEX "Provider_verified_inn_key"
ON "Provider" ("verifiedInn")
WHERE "verifiedInn" IS NOT NULL;

-- CreateTable
CREATE TABLE "ProviderVerificationRequest" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "type" "ProviderType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "inn" TEXT,
    "ogrn" TEXT,
    "submittedSnapshot" JSONB NOT NULL,
    "status" "ProviderVerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" UUID,
    "rejectReason" TEXT,
    "fnsResult" JSONB,
    "fnsCheckedAt" TIMESTAMP(3),
    "fnsSource" TEXT,
    "fnsStatus" "FnsCheckStatus",
    "fnsManualCheckedAt" TIMESTAMP(3),
    "fnsManualCheckedByUserId" UUID,

    CONSTRAINT "ProviderVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderVerificationRequest_providerId_submittedAt_idx" ON "ProviderVerificationRequest"("providerId", "submittedAt");

-- CreateIndex
CREATE INDEX "ProviderVerificationRequest_status_submittedAt_idx" ON "ProviderVerificationRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "ProviderVerificationRequest_inn_idx" ON "ProviderVerificationRequest"("inn");

-- CreateIndex
CREATE INDEX "ProviderVerificationRequest_ogrn_idx" ON "ProviderVerificationRequest"("ogrn");

-- AddForeignKey
ALTER TABLE "ProviderVerificationRequest" ADD CONSTRAINT "ProviderVerificationRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationRequest" ADD CONSTRAINT "ProviderVerificationRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationRequest" ADD CONSTRAINT "ProviderVerificationRequest_fnsManualCheckedByUserId_fkey" FOREIGN KEY ("fnsManualCheckedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

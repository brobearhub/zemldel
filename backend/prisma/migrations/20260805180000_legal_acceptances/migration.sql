-- CreateEnum
CREATE TYPE "LegalDocId" AS ENUM ('TERMS', 'PRIVACY', 'CONSENT', 'OFFER');

-- CreateEnum
CREATE TYPE "LegalAcceptanceContext" AS ENUM ('SIGNUP', 'PROVIDER_ONBOARDING', 'CONTRACT');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN "termsVersion" TEXT;

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "docId" "LegalDocId" NOT NULL,
    "version" TEXT NOT NULL,
    "context" "LegalAcceptanceContext" NOT NULL,
    "requestId" UUID,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_docId_idx" ON "LegalAcceptance"("userId", "docId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_requestId_idx" ON "LegalAcceptance"("requestId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_context_docId_idx" ON "LegalAcceptance"("context", "docId");

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

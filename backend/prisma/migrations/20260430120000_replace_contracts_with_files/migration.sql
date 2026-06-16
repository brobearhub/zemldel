-- Drop legacy contract editor tables (templates/instances/blocks/comments/signatures)
DROP TABLE IF EXISTS "ContractSignature" CASCADE;
DROP TABLE IF EXISTS "ContractFeedback" CASCADE;
DROP TABLE IF EXISTS "ContractComment" CASCADE;
DROP TABLE IF EXISTS "ContractCommentThread" CASCADE;
DROP TABLE IF EXISTS "ContractBlockVersion" CASCADE;
DROP TABLE IF EXISTS "ContractBlock" CASCADE;
DROP TABLE IF EXISTS "ContractInstance" CASCADE;
DROP TABLE IF EXISTS "ContractTemplate" CASCADE;

-- Drop legacy enums
DROP TYPE IF EXISTS "ContractCommentStatus";
DROP TYPE IF EXISTS "ContractBlockStatus";
DROP TYPE IF EXISTS "ContractSignerRole";
DROP TYPE IF EXISTS "ContractStatus";

-- CreateEnum
CREATE TYPE "RequestContractFileStatus" AS ENUM (
  'PENDING_CUSTOMER',
  'APPROVED',
  'REVISION_REQUESTED'
);

-- CreateTable
CREATE TABLE "RequestContractFile" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "uploadedByUserId" UUID,
  "decidedByUserId" UUID,
  "decidedAt" TIMESTAMP(3),
  "status" "RequestContractFileStatus" NOT NULL DEFAULT 'PENDING_CUSTOMER',
  "revisionMessage" TEXT,

  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageRelPath" TEXT NOT NULL,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RequestContractFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestContractFile_requestId_updatedAt_idx" ON "RequestContractFile"("requestId", "updatedAt");
CREATE INDEX "RequestContractFile_providerId_updatedAt_idx" ON "RequestContractFile"("providerId", "updatedAt");
CREATE INDEX "RequestContractFile_status_updatedAt_idx" ON "RequestContractFile"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequestContractFile" ADD CONSTRAINT "RequestContractFile_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


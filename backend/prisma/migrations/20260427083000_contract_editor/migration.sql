-- CreateEnum
CREATE TYPE "ContractBlockStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "ContractTemplate"
  ADD COLUMN "editorFormat" TEXT NOT NULL DEFAULT 'markdown',
  ADD COLUMN "editorVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "variables" JSONB,
  ADD COLUMN "lastRevisionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ContractInstance"
  ADD COLUMN "editorFormat" TEXT NOT NULL DEFAULT 'markdown',
  ADD COLUMN "editorVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "variableSnapshot" JSONB,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ProviderLegalProfile" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "legalName" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "legalAddress" TEXT,
    "postalAddress" TEXT,
    "bankName" TEXT,
    "bankBik" TEXT,
    "bankAccount" TEXT,
    "correspondentAccount" TEXT,
    "signerName" TEXT,
    "signerTitle" TEXT,
    "signerBasis" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLegalProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT,
    "inn" TEXT,
    "registrationAddress" TEXT,
    "postalAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractBlock" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "ContractBlockStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractBlockVersion" (
    "id" UUID NOT NULL,
    "blockId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "content" JSONB NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractBlockVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractCommentThread" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "anchor" JSONB NOT NULL,
    "quote" TEXT,
    "status" "ContractCommentStatus" NOT NULL DEFAULT 'OPEN',
    "createdByRole" "ContractSignerRole" NOT NULL,
    "createdByUserId" UUID,
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractCommentThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractComment" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "authorRole" "ContractSignerRole" NOT NULL,
    "authorUserId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderLegalProfile_providerId_key" ON "ProviderLegalProfile"("providerId");

-- CreateIndex
CREATE INDEX "ProviderLegalProfile_providerId_idx" ON "ProviderLegalProfile"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLegalProfile_userId_key" ON "CustomerLegalProfile"("userId");

-- CreateIndex
CREATE INDEX "CustomerLegalProfile_userId_idx" ON "CustomerLegalProfile"("userId");

-- CreateIndex
CREATE INDEX "ContractBlock_status_updatedAt_idx" ON "ContractBlock"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ContractBlock_category_idx" ON "ContractBlock"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ContractBlockVersion_blockId_version_key" ON "ContractBlockVersion"("blockId", "version");

-- CreateIndex
CREATE INDEX "ContractBlockVersion_blockId_createdAt_idx" ON "ContractBlockVersion"("blockId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractCommentThread_contractId_status_createdAt_idx" ON "ContractCommentThread"("contractId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ContractCommentThread_createdByUserId_createdAt_idx" ON "ContractCommentThread"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractComment_threadId_createdAt_idx" ON "ContractComment"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractComment_authorUserId_createdAt_idx" ON "ContractComment"("authorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderLegalProfile" ADD CONSTRAINT "ProviderLegalProfile_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLegalProfile" ADD CONSTRAINT "CustomerLegalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractBlockVersion" ADD CONSTRAINT "ContractBlockVersion_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContractBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractCommentThread" ADD CONSTRAINT "ContractCommentThread_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ContractInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractCommentThread" ADD CONSTRAINT "ContractCommentThread_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractCommentThread" ADD CONSTRAINT "ContractCommentThread_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractComment" ADD CONSTRAINT "ContractComment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ContractCommentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractComment" ADD CONSTRAINT "ContractComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

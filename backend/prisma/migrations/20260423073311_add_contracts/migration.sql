-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractSignerRole" AS ENUM ('CUSTOMER', 'PROVIDER');

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentTemplateId" UUID,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractInstance" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "serviceRequestId" UUID,
    "customerUserId" UUID,
    "templateId" UUID,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "signerRole" "ContractSignerRole" NOT NULL,
    "signerUserId" UUID,
    "method" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractTemplate_providerId_updatedAt_idx" ON "ContractTemplate"("providerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ContractTemplate_parentTemplateId_idx" ON "ContractTemplate"("parentTemplateId");

-- CreateIndex
CREATE INDEX "ContractInstance_providerId_updatedAt_idx" ON "ContractInstance"("providerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ContractInstance_serviceRequestId_idx" ON "ContractInstance"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ContractInstance_customerUserId_updatedAt_idx" ON "ContractInstance"("customerUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "ContractInstance_status_updatedAt_idx" ON "ContractInstance"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ContractSignature_contractId_signedAt_idx" ON "ContractSignature"("contractId", "signedAt");

-- CreateIndex
CREATE INDEX "ContractSignature_signerUserId_signedAt_idx" ON "ContractSignature"("signerUserId", "signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSignature_contractId_signerRole_key" ON "ContractSignature"("contractId", "signerRole");

-- AddForeignKey
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInstance" ADD CONSTRAINT "ContractInstance_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInstance" ADD CONSTRAINT "ContractInstance_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInstance" ADD CONSTRAINT "ContractInstance_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractInstance" ADD CONSTRAINT "ContractInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ContractInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_signerUserId_fkey" FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

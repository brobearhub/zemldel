-- CreateEnum
CREATE TYPE "ServiceRequestProviderOfferStatus" AS ENUM ('SELECTED', 'DECLINED');

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_pendingProviderId_fkey";

-- DropIndex
DROP INDEX "ServiceRequest_pendingProviderId_status_idx";

-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "pendingAt",
DROP COLUMN "pendingInitiator",
DROP COLUMN "pendingProviderId";

-- DropEnum
DROP TYPE "ServiceRequestPendingInitiator";

-- CreateTable
CREATE TABLE "ServiceRequestProviderOffer" (
    "id" UUID NOT NULL,
    "serviceRequestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "status" "ServiceRequestProviderOfferStatus" NOT NULL DEFAULT 'SELECTED',
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequestProviderOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequestProviderOffer_serviceRequestId_status_idx" ON "ServiceRequestProviderOffer"("serviceRequestId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequestProviderOffer_providerId_status_idx" ON "ServiceRequestProviderOffer"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestProviderOffer_serviceRequestId_providerId_key" ON "ServiceRequestProviderOffer"("serviceRequestId", "providerId");

-- AddForeignKey
ALTER TABLE "ServiceRequestProviderOffer" ADD CONSTRAINT "ServiceRequestProviderOffer_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestProviderOffer" ADD CONSTRAINT "ServiceRequestProviderOffer_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "ServiceRequestPendingInitiator" AS ENUM ('CUSTOMER', 'PROVIDER');

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "pendingAt" TIMESTAMP(3),
ADD COLUMN     "pendingInitiator" "ServiceRequestPendingInitiator",
ADD COLUMN     "pendingProviderId" UUID;

-- CreateIndex
CREATE INDEX "ServiceRequest_pendingProviderId_status_idx" ON "ServiceRequest"("pendingProviderId", "status");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_pendingProviderId_fkey" FOREIGN KEY ("pendingProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

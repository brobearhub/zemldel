-- AlterTable
ALTER TABLE "RequestRemark" ADD COLUMN     "submissionId" UUID;

-- CreateTable
CREATE TABLE "RequestDeliverySubmission" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestDeliverySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestDeliverySubmission_requestId_submittedAt_idx" ON "RequestDeliverySubmission"("requestId", "submittedAt");

-- CreateIndex
CREATE INDEX "RequestDeliverySubmission_providerId_submittedAt_idx" ON "RequestDeliverySubmission"("providerId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestDeliverySubmission_requestId_sequence_key" ON "RequestDeliverySubmission"("requestId", "sequence");

-- CreateIndex
CREATE INDEX "RequestRemark_submissionId_idx" ON "RequestRemark"("submissionId");

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RequestDeliverySubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDeliverySubmission" ADD CONSTRAINT "RequestDeliverySubmission_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDeliverySubmission" ADD CONSTRAINT "RequestDeliverySubmission_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDeliverySubmission" ADD CONSTRAINT "RequestDeliverySubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN "totalAmountKopecks" INTEGER;

-- CreateTable
CREATE TABLE "RequestPayment" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "amountKopecks" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestPayment_requestId_paidAt_idx" ON "RequestPayment"("requestId", "paidAt");

-- CreateIndex
CREATE INDEX "RequestPayment_providerId_paidAt_idx" ON "RequestPayment"("providerId", "paidAt");

-- AddForeignKey
ALTER TABLE "RequestPayment" ADD CONSTRAINT "RequestPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPayment" ADD CONSTRAINT "RequestPayment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPayment" ADD CONSTRAINT "RequestPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

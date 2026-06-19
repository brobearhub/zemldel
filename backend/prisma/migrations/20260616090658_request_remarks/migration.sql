-- CreateEnum
CREATE TYPE "RequestRemarkStatus" AS ENUM ('OPEN', 'DONE');

-- CreateEnum
CREATE TYPE "RequestRemarkAuthorSide" AS ENUM ('CUSTOMER', 'PROVIDER');

-- CreateTable
CREATE TABLE "RequestRemark" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "authorSide" "RequestRemarkAuthorSide" NOT NULL,
    "status" "RequestRemarkStatus" NOT NULL DEFAULT 'OPEN',
    "text" TEXT NOT NULL,
    "createdByUserId" UUID,
    "createdByProviderId" UUID,
    "doneByUserId" UUID,
    "doneByProviderId" UUID,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestRemark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestRemark_requestId_createdAt_idx" ON "RequestRemark"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestRemark_requestId_status_idx" ON "RequestRemark"("requestId", "status");

-- CreateIndex
CREATE INDEX "RequestRemark_authorSide_status_idx" ON "RequestRemark"("authorSide", "status");

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_doneByUserId_fkey" FOREIGN KEY ("doneByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_createdByProviderId_fkey" FOREIGN KEY ("createdByProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRemark" ADD CONSTRAINT "RequestRemark_doneByProviderId_fkey" FOREIGN KEY ("doneByProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

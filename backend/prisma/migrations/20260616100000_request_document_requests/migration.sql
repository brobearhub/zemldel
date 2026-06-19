-- CreateEnum
CREATE TYPE "RequestDocumentRequestStatus" AS ENUM ('REQUESTED', 'UPLOADED');

-- CreateTable
CREATE TABLE "RequestDocumentRequest" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "uploadedAt" TIMESTAMP(3),
    "status" "RequestDocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "storageRelPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestDocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_requestId_sortOrder_idx" ON "RequestDocumentRequest"("requestId", "sortOrder");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_requestId_status_idx" ON "RequestDocumentRequest"("requestId", "status");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_providerId_updatedAt_idx" ON "RequestDocumentRequest"("providerId", "updatedAt");

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_status_updatedAt_idx" ON "RequestDocumentRequest"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "RequestDocumentRequest" ADD CONSTRAINT "RequestDocumentRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocumentRequest" ADD CONSTRAINT "RequestDocumentRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocumentRequest" ADD CONSTRAINT "RequestDocumentRequest_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


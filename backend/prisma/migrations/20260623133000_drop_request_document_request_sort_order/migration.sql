-- DropIndex
DROP INDEX "RequestDocumentRequest_requestId_sortOrder_idx";

-- AlterTable
ALTER TABLE "RequestDocumentRequest" DROP COLUMN "sortOrder";

-- CreateIndex
CREATE INDEX "RequestDocumentRequest_requestId_createdAt_idx" ON "RequestDocumentRequest"("requestId", "createdAt");


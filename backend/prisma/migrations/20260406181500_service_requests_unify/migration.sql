-- CreateEnum
CREATE TYPE "ServiceRequestKind" AS ENUM ('UNLINKED', 'TEMPLATE', 'SERVICE');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'DISCUSSING', 'LOCKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "serviceRequestId" UUID;

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" UUID NOT NULL,
    "kind" "ServiceRequestKind" NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
    "serviceId" UUID,
    "templateId" UUID,
    "providerId" UUID,
    "customerUserId" UUID,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "message" TEXT,
    "location" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequest_kind_status_idx" ON "ServiceRequest"("kind", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerUserId_status_idx" ON "ServiceRequest"("customerUserId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_providerId_status_idx" ON "ServiceRequest"("providerId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_templateId_status_idx" ON "ServiceRequest"("templateId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_serviceId_status_idx" ON "ServiceRequest"("serviceId", "status");

-- Backfill from ServiceLead -> ServiceRequest(kind=SERVICE)
INSERT INTO "ServiceRequest" (
    "id",
    "kind",
    "status",
    "serviceId",
    "templateId",
    "providerId",
    "customerUserId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "message",
    "location",
    "lockedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    l."id",
    'SERVICE'::"ServiceRequestKind",
    CASE l."status"::text
      WHEN 'NEW' THEN 'NEW'::"ServiceRequestStatus"
      WHEN 'IN_PROGRESS' THEN 'LOCKED'::"ServiceRequestStatus"
      WHEN 'CONVERTED_TO_ORDER' THEN 'ACTIVE'::"ServiceRequestStatus"
      WHEN 'CLOSED' THEN 'CLOSED'::"ServiceRequestStatus"
      ELSE 'NEW'::"ServiceRequestStatus"
    END,
    l."serviceId",
    NULL,
    l."providerId",
    l."customerUserId",
    l."customerName",
    l."customerEmail",
    l."customerPhone",
    l."message",
    NULL,
    NULL,
    l."createdAt",
    l."updatedAt"
FROM "ServiceLead" l;

-- Backfill from ServiceAnnouncement -> ServiceRequest(kind=TEMPLATE)
INSERT INTO "ServiceRequest" (
    "id",
    "kind",
    "status",
    "serviceId",
    "templateId",
    "providerId",
    "customerUserId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "message",
    "location",
    "lockedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    a."id",
    'TEMPLATE'::"ServiceRequestKind",
    CASE a."status"::text
      WHEN 'NEW' THEN 'NEW'::"ServiceRequestStatus"
      WHEN 'DISCUSSING' THEN 'DISCUSSING'::"ServiceRequestStatus"
      WHEN 'TAKEN' THEN 'LOCKED'::"ServiceRequestStatus"
      WHEN 'CONVERTED_TO_ORDER' THEN 'ACTIVE'::"ServiceRequestStatus"
      WHEN 'CLOSED' THEN 'CLOSED'::"ServiceRequestStatus"
      ELSE 'NEW'::"ServiceRequestStatus"
    END,
    NULL,
    a."templateId",
    a."takenByProviderId",
    a."customerUserId",
    NULL,
    NULL,
    NULL,
    a."message",
    NULL,
    a."takenAt",
    a."createdAt",
    a."updatedAt"
FROM "ServiceAnnouncement" a;

-- If there are Orders, reflect their phase on ServiceRequest.
-- Also ensure service/provider/customer are filled on the request.
UPDATE "ServiceRequest" r
SET
  "status" = CASE o."status"::text
    WHEN 'ACTIVE' THEN 'ACTIVE'::"ServiceRequestStatus"
    WHEN 'COMPLETED' THEN 'COMPLETED'::"ServiceRequestStatus"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"ServiceRequestStatus"
    ELSE r."status"
  END,
  "serviceId" = COALESCE(r."serviceId", o."serviceId"),
  "providerId" = COALESCE(r."providerId", o."providerId"),
  "customerUserId" = COALESCE(r."customerUserId", o."customerUserId"),
  "updatedAt" = GREATEST(r."updatedAt", o."updatedAt")
FROM "Order" o
WHERE
  (o."serviceLeadId" IS NOT NULL AND r."id" = o."serviceLeadId")
  OR (o."serviceAnnouncementId" IS NOT NULL AND r."id" = o."serviceAnnouncementId");

-- Backfill Conversation -> ServiceRequest subject
UPDATE "Conversation" c
SET "serviceRequestId" = c."serviceLeadId"
WHERE c."serviceLeadId" IS NOT NULL;

UPDATE "Conversation" c
SET "serviceRequestId" = c."serviceAnnouncementId"
WHERE c."serviceAnnouncementId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Conversation_serviceRequestId_idx" ON "Conversation"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_serviceRequestId_providerId_key" ON "Conversation"("serviceRequestId", "providerId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;


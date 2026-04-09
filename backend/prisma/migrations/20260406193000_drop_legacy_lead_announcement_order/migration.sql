-- Ensure serviceRequestId is populated before dropping legacy columns
UPDATE "Conversation"
SET "serviceRequestId" = "serviceLeadId"
WHERE "serviceRequestId" IS NULL AND "serviceLeadId" IS NOT NULL;

UPDATE "Conversation"
SET "serviceRequestId" = "serviceAnnouncementId"
WHERE "serviceRequestId" IS NULL AND "serviceAnnouncementId" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Conversation" WHERE "serviceRequestId" IS NULL) THEN
    RAISE EXCEPTION 'Conversation.serviceRequestId has NULL rows; cannot enforce NOT NULL';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_serviceAnnouncementId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_serviceLeadId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerUserId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_providerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_serviceAnnouncementId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_serviceLeadId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceAnnouncement" DROP CONSTRAINT "ServiceAnnouncement_customerUserId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceAnnouncement" DROP CONSTRAINT "ServiceAnnouncement_takenByProviderId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceAnnouncement" DROP CONSTRAINT "ServiceAnnouncement_templateId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceLead" DROP CONSTRAINT "ServiceLead_customerUserId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceLead" DROP CONSTRAINT "ServiceLead_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceLead" DROP CONSTRAINT "ServiceLead_serviceId_fkey";

-- DropIndex
DROP INDEX "Conversation_serviceAnnouncementId_idx";

-- DropIndex
DROP INDEX "Conversation_serviceAnnouncementId_providerId_key";

-- DropIndex
DROP INDEX "Conversation_serviceLeadId_key";

-- AlterTable
ALTER TABLE "Conversation"
  DROP COLUMN "serviceAnnouncementId",
  DROP COLUMN "serviceLeadId",
  ALTER COLUMN "serviceRequestId" SET NOT NULL;

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "ServiceAnnouncement";

-- DropTable
DROP TABLE "ServiceLead";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "ServiceAnnouncementStatus";

-- DropEnum
DROP TYPE "ServiceLeadStatus";


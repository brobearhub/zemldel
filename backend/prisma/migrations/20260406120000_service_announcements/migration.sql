-- CreateEnum
CREATE TYPE "ServiceAnnouncementStatus" AS ENUM ('NEW', 'DISCUSSING', 'TAKEN', 'CONVERTED_TO_ORDER', 'CLOSED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "serviceAnnouncementId" UUID,
ALTER COLUMN "serviceLeadId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "serviceAnnouncementId" UUID,
ALTER COLUMN "serviceLeadId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ServiceAnnouncement" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "customerUserId" UUID NOT NULL,
    "message" TEXT,
    "status" "ServiceAnnouncementStatus" NOT NULL DEFAULT 'NEW',
    "takenByProviderId" UUID,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceAnnouncement_templateId_status_idx" ON "ServiceAnnouncement"("templateId", "status");

-- CreateIndex
CREATE INDEX "ServiceAnnouncement_customerUserId_status_idx" ON "ServiceAnnouncement"("customerUserId", "status");

-- CreateIndex
CREATE INDEX "ServiceAnnouncement_takenByProviderId_idx" ON "ServiceAnnouncement"("takenByProviderId");

-- CreateIndex
CREATE INDEX "Conversation_serviceAnnouncementId_idx" ON "Conversation"("serviceAnnouncementId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_serviceAnnouncementId_providerId_key" ON "Conversation"("serviceAnnouncementId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_serviceAnnouncementId_key" ON "Order"("serviceAnnouncementId");

-- CreateIndex
CREATE INDEX "ServiceCategory_slug_idx" ON "ServiceCategory"("slug");

-- AddForeignKey
ALTER TABLE "ServiceAnnouncement" ADD CONSTRAINT "ServiceAnnouncement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAnnouncement" ADD CONSTRAINT "ServiceAnnouncement_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAnnouncement" ADD CONSTRAINT "ServiceAnnouncement_takenByProviderId_fkey" FOREIGN KEY ("takenByProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_serviceAnnouncementId_fkey" FOREIGN KEY ("serviceAnnouncementId") REFERENCES "ServiceAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_serviceAnnouncementId_fkey" FOREIGN KEY ("serviceAnnouncementId") REFERENCES "ServiceAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;


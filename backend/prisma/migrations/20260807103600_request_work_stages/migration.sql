-- CreateEnum
CREATE TYPE "WorkStageLifecycle" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "WorkStageDocSlotStatus" AS ENUM ('REQUESTED', 'UPLOADED');

-- AlterTable
ALTER TABLE "ProviderUserSettings" ADD COLUMN "workStageStatuses" JSONB;

-- CreateTable
CREATE TABLE "RequestWorkStage" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "statusKey" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "lifecycle" "WorkStageLifecycle" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWorkStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestWorkStageFile" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageRelPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWorkStageFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestWorkStageDocSlot" (
    "id" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkStageDocSlotStatus" NOT NULL DEFAULT 'REQUESTED',
    "uploadedByUserId" UUID,
    "uploadedAt" TIMESTAMP(3),
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "storageRelPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWorkStageDocSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestWorkStage_requestId_sortOrder_idx" ON "RequestWorkStage"("requestId", "sortOrder");

-- CreateIndex
CREATE INDEX "RequestWorkStage_providerId_statusKey_idx" ON "RequestWorkStage"("providerId", "statusKey");

-- CreateIndex
CREATE INDEX "RequestWorkStage_requestId_lifecycle_idx" ON "RequestWorkStage"("requestId", "lifecycle");

-- CreateIndex
CREATE INDEX "RequestWorkStageFile_stageId_createdAt_idx" ON "RequestWorkStageFile"("stageId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestWorkStageDocSlot_stageId_createdAt_idx" ON "RequestWorkStageDocSlot"("stageId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestWorkStageDocSlot_stageId_status_idx" ON "RequestWorkStageDocSlot"("stageId", "status");

-- AddForeignKey
ALTER TABLE "RequestWorkStage" ADD CONSTRAINT "RequestWorkStage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStage" ADD CONSTRAINT "RequestWorkStage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStageFile" ADD CONSTRAINT "RequestWorkStageFile_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RequestWorkStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWorkStageDocSlot" ADD CONSTRAINT "RequestWorkStageDocSlot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RequestWorkStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

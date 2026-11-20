-- CreateEnum
CREATE TYPE "LandListingKind" AS ENUM ('SALE', 'SELECTION');

-- CreateEnum
CREATE TYPE "LandDealType" AS ENUM ('WHOLE', 'SHARE', 'LEASE_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "LandListingStatus" AS ENUM ('DRAFT', 'PENDING', 'CHANGES_REQUIRED', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LandDocumentStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ConversationKind" ADD VALUE 'LAND';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "landListingId" UUID,
ADD COLUMN     "landSellerUserId" UUID,
ALTER COLUMN "providerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LandParcel" (
    "id" UUID NOT NULL,
    "cadastralNumber" TEXT NOT NULL,

    CONSTRAINT "LandParcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandListing" (
    "id" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "providerId" UUID,
    "parcelId" UUID,
    "serviceId" UUID,
    "kind" "LandListingKind" NOT NULL DEFAULT 'SALE',
    "dealType" "LandDealType" NOT NULL DEFAULT 'WHOLE',
    "status" "LandListingStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "category" TEXT NOT NULL DEFAULT '',
    "permittedUses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purposes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sellerRelation" TEXT NOT NULL DEFAULT 'OWNER',
    "areaM2" DECIMAL(18,2),
    "priceRubles" DECIMAL(18,2),
    "details" JSONB NOT NULL DEFAULT '{}',
    "phone" TEXT NOT NULL DEFAULT '',
    "showPhone" BOOLEAN NOT NULL DEFAULT false,
    "documentStatus" "LandDocumentStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "documentReviewScope" TEXT,
    "documentReviewedAt" TIMESTAMP(3),
    "moderationReason" TEXT,
    "withdrawalReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandMedia" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandFavorite" (
    "userId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandFavorite_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateTable
CREATE TABLE "LandReview" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "reviewerUserId" UUID,
    "kind" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "listingVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandObjectCleanup" (
    "objectKey" TEXT NOT NULL,
    "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandObjectCleanup_pkey" PRIMARY KEY ("objectKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandParcel_cadastralNumber_key" ON "LandParcel"("cadastralNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LandListing_serviceId_key" ON "LandListing"("serviceId");

-- CreateIndex
CREATE INDEX "LandListing_status_kind_publishedAt_idx" ON "LandListing"("status", "kind", "publishedAt");

-- CreateIndex
CREATE INDEX "LandListing_providerId_status_idx" ON "LandListing"("providerId", "status");

-- CreateIndex
CREATE INDEX "LandListing_authorUserId_status_idx" ON "LandListing"("authorUserId", "status");

-- CreateIndex
CREATE INDEX "LandListing_parcelId_idx" ON "LandListing"("parcelId");

-- CreateIndex
CREATE INDEX "LandListing_status_latitude_longitude_idx" ON "LandListing"("status", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "LandListing_status_dealType_priceRubles_idx" ON "LandListing"("status", "dealType", "priceRubles");

-- CreateIndex
CREATE UNIQUE INDEX "LandMedia_storageKey_key" ON "LandMedia"("storageKey");

-- CreateIndex
CREATE INDEX "LandMedia_listingId_kind_position_idx" ON "LandMedia"("listingId", "kind", "position");

-- CreateIndex
CREATE INDEX "LandFavorite_listingId_idx" ON "LandFavorite"("listingId");

-- CreateIndex
CREATE INDEX "LandReview_listingId_createdAt_idx" ON "LandReview"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "LandObjectCleanup_notBefore_idx" ON "LandObjectCleanup"("notBefore");

-- CreateIndex
CREATE INDEX "Conversation_landSellerUserId_idx" ON "Conversation"("landSellerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_landListingId_customerUserId_key" ON "Conversation"("landListingId", "customerUserId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_landListingId_fkey" FOREIGN KEY ("landListingId") REFERENCES "LandListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_landSellerUserId_fkey" FOREIGN KEY ("landSellerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandListing" ADD CONSTRAINT "LandListing_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandListing" ADD CONSTRAINT "LandListing_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandListing" ADD CONSTRAINT "LandListing_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "LandParcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandListing" ADD CONSTRAINT "LandListing_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandMedia" ADD CONSTRAINT "LandMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandFavorite" ADD CONSTRAINT "LandFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandFavorite" ADD CONSTRAINT "LandFavorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandReview" ADD CONSTRAINT "LandReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandReview" ADD CONSTRAINT "LandReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- LAND is the only conversation that may lack a provider; no weakening of request/direct/partner invariants.
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_land_participants_check" CHECK (
  ("kind"::text = 'LAND' AND "landListingId" IS NOT NULL AND "requestId" IS NULL AND "partnershipId" IS NULL AND "partnerProviderId" IS NULL AND
    (("providerId" IS NULL AND "landSellerUserId" IS NOT NULL AND "landSellerUserId" <> "customerUserId") OR ("providerId" IS NOT NULL AND "landSellerUserId" IS NULL)))
  OR ("kind"::text <> 'LAND' AND "providerId" IS NOT NULL AND "landListingId" IS NULL AND "landSellerUserId" IS NULL)
);
ALTER TABLE "LandListing" ADD CONSTRAINT "LandListing_kind_relations_check" CHECK (
  ("kind" = 'SALE' AND "serviceId" IS NULL) OR
  ("kind" = 'SELECTION' AND "providerId" IS NOT NULL AND ("status" = 'DRAFT' OR "serviceId" IS NOT NULL))
);
ALTER TABLE "LandListing" ADD CONSTRAINT "LandListing_publication_check" CHECK (
  "status" NOT IN ('PENDING', 'PUBLISHED') OR "kind" = 'SELECTION' OR
  ("parcelId" IS NOT NULL AND "areaM2" IS NOT NULL AND "areaM2" > 0 AND "priceRubles" IS NOT NULL AND "priceRubles" >= 0 AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL)
);
ALTER TABLE "LandMedia" ADD CONSTRAINT "LandMedia_kind_check" CHECK ("kind" IN ('PHOTO', 'DOCUMENT'));

-- Preserve the existing subject invariants while adding a fourth, non-request subject.
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_subject_check";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_subject_check" CHECK (
  ("kind"::text = 'REQUEST' AND "requestId" IS NOT NULL AND "directState" IS NULL AND "partnershipId" IS NULL AND "partnerProviderId" IS NULL)
  OR ("kind"::text = 'DIRECT' AND "requestId" IS NULL AND "directState" IS NOT NULL AND "partnershipId" IS NULL AND "partnerProviderId" IS NULL)
  OR ("kind"::text = 'PARTNER' AND "requestId" IS NULL AND "directState" IS NULL AND "partnershipId" IS NOT NULL AND "partnerProviderId" IS NOT NULL AND "providerId" <> "partnerProviderId")
  OR ("kind"::text = 'LAND' AND "requestId" IS NULL AND "directState" IS NULL AND "landListingId" IS NOT NULL AND "partnershipId" IS NULL AND "partnerProviderId" IS NULL)
);

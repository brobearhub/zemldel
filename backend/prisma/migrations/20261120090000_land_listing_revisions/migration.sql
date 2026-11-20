BEGIN;

CREATE TABLE "LandListingRevision" (
    "listingId" UUID PRIMARY KEY REFERENCES "LandListing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "publishedVersion" INTEGER NOT NULL,
    "publishedUpdatedAt" TIMESTAMP(3) NOT NULL,
    "draft" JSONB NOT NULL,
    "mediaIds" UUID[] NOT NULL,
    "status" "LandListingStatus" NOT NULL DEFAULT 'DRAFT',
    "documentStatus" "LandDocumentStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "documentReviewScope" TEXT,
    "documentReviewedAt" TIMESTAMP(3),
    "moderationReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    CHECK ("status" IN ('DRAFT', 'PENDING', 'CHANGES_REQUIRED'))
);
CREATE INDEX "LandListingRevision_status_submittedAt_idx" ON "LandListingRevision"("status", "submittedAt");
ALTER TABLE "LandMedia" ADD COLUMN "revisionOnly" BOOLEAN NOT NULL DEFAULT false;

COMMIT;

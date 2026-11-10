ALTER TABLE "Provider" ADD COLUMN "slugChangedAt" TIMESTAMP(3);

CREATE TABLE "ProviderSlugChange" (
  "orderId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "previousSlug" TEXT NOT NULL,
  "targetSlug" TEXT NOT NULL,
  "reservedSlug" TEXT,
  "reservedUntil" TIMESTAMP(3) NOT NULL,
  "offerVersion" TEXT NOT NULL,
  "offerMarkdown" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3),
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ProviderSlugChange_pkey" PRIMARY KEY ("orderId"),
  CONSTRAINT "ProviderSlugChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BillingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProviderSlugChange_reservedSlug_key" ON "ProviderSlugChange"("reservedSlug");

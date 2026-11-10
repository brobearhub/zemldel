-- Existing payments remain unchanged. Future renewals require recorded consent.
CREATE TABLE "BillingConsent" (
    "providerId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "offerVersion" TEXT,
    "offerMarkdown" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingConsent_pkey" PRIMARY KEY ("providerId", "version"),
    CONSTRAINT "BillingConsent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

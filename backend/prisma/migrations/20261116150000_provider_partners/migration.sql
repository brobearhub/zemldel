CREATE TYPE "PartnershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED');
CREATE TABLE "ProviderPartnership" (
  "id" UUID NOT NULL,
  "requesterProviderId" UUID NOT NULL,
  "partnerProviderId" UUID,
  "pairKey" TEXT,
  "email" TEXT,
  "status" "PartnershipStatus" NOT NULL DEFAULT 'PENDING',
  "invitedById" UUID NOT NULL,
  "tokenHash" TEXT,
  "sentAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderPartnership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProviderPartnership_requesterProviderId_fkey" FOREIGN KEY ("requesterProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProviderPartnership_partnerProviderId_fkey" FOREIGN KEY ("partnerProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProviderPartnership_not_self" CHECK ("requesterProviderId" <> "partnerProviderId"),
  CONSTRAINT "ProviderPartnership_recipient" CHECK ("partnerProviderId" IS NOT NULL OR "email" IS NOT NULL),
  CONSTRAINT "ProviderPartnership_active_recipient" CHECK ("status" <> 'ACTIVE' OR "partnerProviderId" IS NOT NULL)
);
CREATE UNIQUE INDEX "ProviderPartnership_pairKey_key" ON "ProviderPartnership"("pairKey");
CREATE UNIQUE INDEX "ProviderPartnership_tokenHash_key" ON "ProviderPartnership"("tokenHash");
CREATE UNIQUE INDEX "ProviderPartnership_requesterProviderId_email_key" ON "ProviderPartnership"("requesterProviderId", "email");
CREATE INDEX "ProviderPartnership_requesterProviderId_status_idx" ON "ProviderPartnership"("requesterProviderId", "status");
CREATE INDEX "ProviderPartnership_partnerProviderId_status_idx" ON "ProviderPartnership"("partnerProviderId", "status");

ALTER TYPE "ConversationKind" ADD VALUE 'PARTNER';
ALTER TABLE "Conversation" ADD COLUMN "partnershipId" UUID;
ALTER TABLE "Conversation" ADD COLUMN "partnerProviderId" UUID;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "ProviderPartnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_partnerProviderId_fkey" FOREIGN KEY ("partnerProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Conversation_partnershipId_key" ON "Conversation"("partnershipId");
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_subject_check";
-- Compare text so this migration also works when run in a transaction with ADD VALUE.
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_subject_check" CHECK (
  ("kind"::text = 'REQUEST' AND "requestId" IS NOT NULL AND "directState" IS NULL AND "partnershipId" IS NULL AND "partnerProviderId" IS NULL) OR
  ("kind"::text = 'DIRECT' AND "requestId" IS NULL AND "directState" IS NOT NULL AND "partnershipId" IS NULL AND "partnerProviderId" IS NULL) OR
  ("kind"::text = 'PARTNER' AND "requestId" IS NULL AND "directState" IS NULL AND "partnershipId" IS NOT NULL AND "partnerProviderId" IS NOT NULL AND "providerId" <> "partnerProviderId")
);
CREATE INDEX "Conversation_partnerProviderId_idx" ON "Conversation"("partnerProviderId");

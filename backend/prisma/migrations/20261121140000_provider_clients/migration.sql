CREATE TYPE "ProviderWorkStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE');
CREATE TYPE "ProviderClientSource" AS ENUM ('MANUAL', 'CONTRACT');

CREATE TABLE "ProviderClient" (
    "id" UUID PRIMARY KEY,
    "providerId" UUID NOT NULL REFERENCES "Provider"("id") ON UPDATE CASCADE ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "customerUserId" UUID REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL,
    "source" "ProviderClientSource" NOT NULL DEFAULT 'MANUAL',
    "invitationHash" TEXT,
    "invitationExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ProviderClient_invitationHash_key" ON "ProviderClient"("invitationHash");
CREATE UNIQUE INDEX "ProviderClient_providerId_email_key" ON "ProviderClient"("providerId", "email");
CREATE UNIQUE INDEX "ProviderClient_providerId_customerUserId_key" ON "ProviderClient"("providerId", "customerUserId");

ALTER TABLE "Request"
    ADD COLUMN "providerClientId" UUID REFERENCES "ProviderClient"("id") ON UPDATE CASCADE ON DELETE SET NULL,
    ADD COLUMN "providerWorkStatus" "ProviderWorkStatus";
CREATE INDEX "Request_providerClientId_idx" ON "Request"("providerClientId");

-- The customer's account, never the contact address typed on a request, owns the signed contract.
INSERT INTO "ProviderClient" ("id", "providerId", "customerUserId", "email", "name", "source", "createdAt", "updatedAt")
SELECT gen_random_uuid(), r."providerId", u.id, lower(trim(u.email)), u.name, 'CONTRACT', min(r."contractAcceptedAt"), CURRENT_TIMESTAMP
FROM "Request" r JOIN "User" u ON u.id = r."customerUserId"
WHERE r."providerId" IS NOT NULL AND r."contractAcceptedAt" IS NOT NULL
  AND r."contractAcceptedByUserId" = u.id
GROUP BY r."providerId", u.id;

UPDATE "Request" r SET "providerClientId" = c.id FROM "ProviderClient" c
WHERE c."providerId" = r."providerId" AND c."customerUserId" = r."customerUserId"
  AND r."contractAcceptedAt" IS NOT NULL AND r."contractAcceptedByUserId" = c."customerUserId";

CREATE TYPE "RequestPriceProposalAuthorSide" AS ENUM ('CUSTOMER', 'PROVIDER');

CREATE TABLE "RequestPriceProposal" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "amountRubles" INTEGER NOT NULL,
    "authorSide" "RequestPriceProposalAuthorSide" NOT NULL,
    "proposedByUserId" UUID,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" UUID,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestPriceProposal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RequestPriceProposal_amountRubles_check" CHECK ("amountRubles" > 0)
);

CREATE INDEX "RequestPriceProposal_requestId_providerId_createdAt_idx"
ON "RequestPriceProposal"("requestId", "providerId", "createdAt");

CREATE INDEX "RequestPriceProposal_providerId_createdAt_idx"
ON "RequestPriceProposal"("providerId", "createdAt");

CREATE INDEX "RequestPriceProposal_requestId_supersededAt_idx"
ON "RequestPriceProposal"("requestId", "supersededAt");

CREATE UNIQUE INDEX "RequestPriceProposal_active_request_provider_key"
ON "RequestPriceProposal"("requestId", "providerId")
WHERE "supersededAt" IS NULL;

ALTER TABLE "RequestPriceProposal"
ADD CONSTRAINT "RequestPriceProposal_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequestPriceProposal"
ADD CONSTRAINT "RequestPriceProposal_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequestPriceProposal"
ADD CONSTRAINT "RequestPriceProposal_proposedByUserId_fkey"
FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RequestPriceProposal"
ADD CONSTRAINT "RequestPriceProposal_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

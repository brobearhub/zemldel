-- Existing proposals keep their original acceptance state.
ALTER TABLE "RequestPriceProposal" ADD COLUMN "isDirectSet" BOOLEAN NOT NULL DEFAULT false;

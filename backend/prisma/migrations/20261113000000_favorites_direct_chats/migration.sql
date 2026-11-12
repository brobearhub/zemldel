CREATE TABLE "ServiceFavorite" (
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "serviceId" UUID NOT NULL REFERENCES "Service"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "serviceId")
);
CREATE INDEX "ServiceFavorite_serviceId_createdAt_idx" ON "ServiceFavorite"("serviceId", "createdAt");
CREATE INDEX "ServiceFavorite_userId_createdAt_idx" ON "ServiceFavorite"("userId", "createdAt");
CREATE TABLE "ProviderFavorite" (
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "providerId" UUID NOT NULL REFERENCES "Provider"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "providerId")
);
CREATE INDEX "ProviderFavorite_providerId_createdAt_idx" ON "ProviderFavorite"("providerId", "createdAt");
CREATE INDEX "ProviderFavorite_userId_createdAt_idx" ON "ProviderFavorite"("userId", "createdAt");
CREATE TYPE "ConversationKind" AS ENUM ('REQUEST', 'DIRECT');
CREATE TYPE "DirectConversationState" AS ENUM ('WAITING', 'ACTIVE', 'DECLINED', 'BLOCKED');
ALTER TABLE "Conversation" ALTER COLUMN "requestId" DROP NOT NULL;
ALTER TABLE "Conversation" ADD COLUMN "kind" "ConversationKind" NOT NULL DEFAULT 'REQUEST';
ALTER TABLE "Conversation" ADD COLUMN "directState" "DirectConversationState";
ALTER TABLE "Conversation" ADD COLUMN "interestContext" JSONB;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_subject_check" CHECK (
  ("kind" = 'REQUEST' AND "requestId" IS NOT NULL AND "directState" IS NULL) OR
  ("kind" = 'DIRECT' AND "requestId" IS NULL AND "directState" IS NOT NULL)
);
CREATE UNIQUE INDEX "Conversation_direct_pair_key" ON "Conversation"("providerId", "customerUserId") WHERE "kind" = 'DIRECT';

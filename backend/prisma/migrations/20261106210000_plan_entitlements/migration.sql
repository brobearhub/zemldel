ALTER TABLE "BillingTestAccount"
 ADD COLUMN "planStartedAt" TIMESTAMP(3), ADD COLUMN "graceUntil" TIMESTAMP(3),
 ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "nextPlan" TEXT,
 ADD COLUMN "rebillId" TEXT, ADD COLUMN "consentVersion" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow', ADD COLUMN "quotaDate" TEXT,
 ADD COLUMN "quotaTimezone" TEXT NOT NULL DEFAULT 'Europe/Moscow', ADD COLUMN "quotaStartedAt" TIMESTAMP(3),
 ADD COLUMN "quotaResetAt" TIMESTAMP(3), ADD COLUMN "dailyUsed" INTEGER NOT NULL DEFAULT 0;
-- Rollout policy: all existing profiles start on Standard; preserve payment history.
UPDATE "BillingTestAccount" SET "plan" = 'STANDARD', "planExpiresAt" = NULL;
ALTER TABLE "BillingTestOrder"
 ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "consentVersion" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "rebillId" TEXT, ADD COLUMN "basePlan" TEXT, ADD COLUMN "baseExpiresAt" TIMESTAMP(3),
 ADD COLUMN "renewalCycle" TIMESTAMP(3), ADD COLUMN "renewalAttempt" INTEGER, ADD COLUMN "chargeStartedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "BillingTestOrder_providerId_renewalCycle_renewalAttempt_key" ON "BillingTestOrder"("providerId", "renewalCycle", "renewalAttempt");
ALTER TABLE "Service" ADD COLUMN "allRussia" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "regionOrder" TEXT[] NOT NULL DEFAULT '{}';
CREATE TABLE "ReplyDebit" (
 "providerId" UUID NOT NULL REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "requestId" UUID NOT NULL, "source" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("providerId", "requestId")
);
INSERT INTO "ReplyDebit" ("providerId", "requestId", "source")
SELECT DISTINCT c."providerId", c."requestId", 'LEGACY'
FROM "Conversation" c JOIN "Request" r ON r.id = c."requestId"
JOIN "Message" m ON m."conversationId" = c.id
JOIN "ProviderMember" pm ON pm."providerId" = c."providerId" AND pm."userId" = m."senderUserId"
WHERE r."serviceId" IS NULL AND r."categoryId" IS NULL AND m.kind = 'USER'
AND m."senderUserId" IS DISTINCT FROM r."customerUserId"
ON CONFLICT DO NOTHING;
CREATE TABLE "ReplyTemplate" (
 id UUID PRIMARY KEY, "providerId" UUID NOT NULL REFERENCES "Provider"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "authorUserId" UUID NOT NULL, shared BOOLEAN NOT NULL DEFAULT false, title TEXT NOT NULL, body TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ReplyTemplate_providerId_idx" ON "ReplyTemplate"("providerId");
CREATE TABLE "ProviderTeamTask" (
 id UUID PRIMARY KEY, "providerId" UUID NOT NULL REFERENCES "Provider"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "requestId" UUID, title TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', "assigneeUserId" UUID,
 "dueAt" TIMESTAMP(3), done BOOLEAN NOT NULL DEFAULT false, history JSONB NOT NULL DEFAULT '[]',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ProviderTeamTask_providerId_updatedAt_idx" ON "ProviderTeamTask"("providerId", "updatedAt");
CREATE TABLE "ServiceView" (
 "serviceId" UUID NOT NULL REFERENCES "Service"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "visitorDay" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("serviceId", "visitorDay")
);
CREATE INDEX "ServiceView_createdAt_idx" ON "ServiceView"("createdAt");
CREATE TABLE "BillingNotice" (
 id UUID PRIMARY KEY, "providerId" UUID NOT NULL REFERENCES "Provider"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 key TEXT NOT NULL UNIQUE, message TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BillingNotice_providerId_createdAt_idx" ON "BillingNotice"("providerId", "createdAt");

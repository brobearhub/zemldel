CREATE TABLE "BillingTestAccount" (
  "providerId" UUID NOT NULL PRIMARY KEY,
  "plan" TEXT NOT NULL DEFAULT 'STANDARD',
  "planExpiresAt" TIMESTAMP(3),
  "replyCredits" INTEGER NOT NULL DEFAULT 0 CHECK ("replyCredits" >= 0),
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "BillingTestAccount_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "BillingTestOrder" (
  "id" UUID NOT NULL PRIMARY KEY,
  "providerId" UUID NOT NULL,
  "operationId" UUID NOT NULL,
  "product" TEXT NOT NULL,
  "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "terminalKey" TEXT NOT NULL,
  "paymentId" TEXT,
  "paymentUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'INITIALIZING',
  "fulfilledAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingTestOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BillingTestOrder_paymentId_key" ON "BillingTestOrder"("paymentId");
CREATE UNIQUE INDEX "BillingTestOrder_providerId_operationId_key" ON "BillingTestOrder"("providerId", "operationId");
CREATE INDEX "BillingTestOrder_providerId_createdAt_idx" ON "BillingTestOrder"("providerId", "createdAt");

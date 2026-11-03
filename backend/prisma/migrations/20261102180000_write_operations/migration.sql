CREATE TABLE "WriteOperation" (
  "actorUserId" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "key" UUID NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WriteOperation_pkey" PRIMARY KEY ("actorUserId", "scope", "key")
);
CREATE INDEX "WriteOperation_createdAt_idx" ON "WriteOperation"("createdAt");

BEGIN;
CREATE TABLE "PassportPhoto" (
  "id" UUID NOT NULL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "storageKey" TEXT NOT NULL UNIQUE,
  "sha256" TEXT NOT NULL CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  "mimeType" TEXT NOT NULL CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp')),
  "sizeBytes" INTEGER NOT NULL CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PassportPhoto_userId_createdAt_idx" ON "PassportPhoto"("userId", "createdAt");
-- The existing trigger records old storage keys for crash-safe erasure,
-- including when photos are removed through account-deletion cascades.
CREATE TRIGGER "PassportPhoto_enqueue_erasure"
  AFTER UPDATE OF "storageKey" OR DELETE ON "PassportPhoto"
  FOR EACH ROW EXECUTE FUNCTION enqueue_replaced_passport_object();
COMMIT;

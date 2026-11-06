BEGIN;

ALTER TABLE "PassportDocument"
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "sha256" TEXT,
  ALTER COLUMN "alg" DROP NOT NULL,
  ALTER COLUMN "keyVersion" DROP NOT NULL,
  ALTER COLUMN "iv" DROP NOT NULL,
  ALTER COLUMN "tag" DROP NOT NULL,
  ALTER COLUMN "ciphertext" DROP NOT NULL;

CREATE UNIQUE INDEX "PassportDocument_storageKey_key" ON "PassportDocument"("storageKey");

ALTER TABLE "PassportDocument" ADD CONSTRAINT "PassportDocument_storage_format_check" CHECK (
  ("storageKey" IS NULL AND "sha256" IS NULL AND "alg" IS NOT NULL AND "keyVersion" IS NOT NULL
    AND "iv" IS NOT NULL AND "tag" IS NOT NULL AND "ciphertext" IS NOT NULL)
  OR
  ("storageKey" IS NOT NULL AND "sha256" IS NOT NULL AND "storageKey" LIKE 'passports/%/form/%.json'
    AND "sha256" ~ '^[a-f0-9]{64}$' AND "alg" IS NULL AND "keyVersion" IS NULL
    AND "iv" IS NULL AND "tag" IS NULL AND "ciphertext" IS NULL)
);

CREATE TABLE "PassportObjectCleanup" (
  "objectKey" TEXT NOT NULL PRIMARY KEY,
  "userId" UUID NOT NULL,
  "reason" TEXT NOT NULL DEFAULT 'DELETE' CHECK ("reason" IN ('DELETE', 'UNCOMMITTED_UPLOAD')),
  "notBefore" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PassportObjectCleanup_notBefore_idx" ON "PassportObjectCleanup"("notBefore");
CREATE INDEX "PassportObjectCleanup_userId_reason_idx" ON "PassportObjectCleanup"("userId", "reason");

-- Keep erasure durable even for SQL updates or account-deletion cascades.
CREATE FUNCTION enqueue_replaced_passport_object() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."storageKey" IS NOT NULL THEN
    IF TG_OP = 'DELETE' OR OLD."storageKey" IS DISTINCT FROM NEW."storageKey" THEN
      INSERT INTO "PassportObjectCleanup" ("objectKey", "userId", "reason", "notBefore")
        VALUES (OLD."storageKey", OLD."userId", 'DELETE', CURRENT_TIMESTAMP)
      ON CONFLICT ("objectKey") DO UPDATE SET "reason" = 'DELETE', "notBefore" = CURRENT_TIMESTAMP;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PassportDocument_enqueue_erasure"
  AFTER UPDATE OF "storageKey" OR DELETE ON "PassportDocument"
  FOR EACH ROW EXECUTE FUNCTION enqueue_replaced_passport_object();

COMMIT;

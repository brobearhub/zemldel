-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE IF NOT EXISTS 'INDIVIDUAL';
ALTER TYPE "ProviderType" ADD VALUE IF NOT EXISTS 'SOLE_PROPRIETOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "middleName" TEXT;

ALTER TABLE "ProviderLegalProfile" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "ProviderLegalProfile" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "ProviderLegalProfile" ADD COLUMN IF NOT EXISTS "middleName" TEXT;

-- Один личный профиль на владельца. Предикат без приведения к text: cast enum::text не IMMUTABLE.
CREATE UNIQUE INDEX IF NOT EXISTS "Provider_one_personal_profile_per_owner"
ON "Provider" ("ownerUserId")
WHERE "ownerUserId" IS NOT NULL
  AND "type" IN (
    'INDIVIDUAL'::"ProviderType",
    'SELF_EMPLOYED'::"ProviderType",
    'SOLE_PROPRIETOR'::"ProviderType"
  );

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN "shortName" TEXT;
UPDATE "ServiceCategory" SET "shortName" = "name" WHERE "shortName" IS NULL;
ALTER TABLE "ServiceCategory" ALTER COLUMN "shortName" SET NOT NULL;

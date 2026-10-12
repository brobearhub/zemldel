-- AlterTable
ALTER TABLE "RegionalCapital" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RegionalCapital" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "about" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "stats" JSONB,
ADD COLUMN     "subtitle" TEXT;

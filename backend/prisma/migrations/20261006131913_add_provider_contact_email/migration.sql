-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "email" TEXT,
ADD COLUMN     "useOwnEmail" BOOLEAN NOT NULL DEFAULT false;

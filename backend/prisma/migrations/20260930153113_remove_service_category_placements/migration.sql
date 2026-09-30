/*
  Warnings:

  - You are about to drop the column `placements` on the `ServiceCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ServiceCategory" DROP COLUMN "placements";

-- DropEnum
DROP TYPE "ServiceCategoryPlacement";

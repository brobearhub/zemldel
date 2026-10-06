/*
  Warnings:

  - You are about to drop the column `badge` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `highlight` on the `Service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "badge",
DROP COLUMN "highlight";

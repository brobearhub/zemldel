/*
  Warnings:

  - You are about to drop the column `templateId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the `ServiceTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceCategoryPlacement" AS ENUM ('HOME');

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_templateId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_templateId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceTemplate" DROP CONSTRAINT "ServiceTemplate_categoryId_fkey";

-- DropIndex
DROP INDEX "Service_templateId_idx";

-- DropIndex
DROP INDEX "ServiceRequest_kind_status_idx";

-- DropIndex
DROP INDEX "ServiceRequest_templateId_status_idx";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "templateId";

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "placements" "ServiceCategoryPlacement"[] DEFAULT ARRAY[]::"ServiceCategoryPlacement"[];

-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "kind",
DROP COLUMN "templateId",
ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "requestCityId" UUID;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "ServiceTemplate";

-- DropEnum
DROP TYPE "ServiceRequestKind";

-- CreateIndex
CREATE INDEX "ServiceRequest_categoryId_status_idx" ON "ServiceRequest"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_requestCityId_status_idx" ON "ServiceRequest"("requestCityId", "status");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_requestCityId_fkey" FOREIGN KEY ("requestCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

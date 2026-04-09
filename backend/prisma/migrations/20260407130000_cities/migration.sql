-- CreateTable
CREATE TABLE "City" (
    "id" UUID NOT NULL,
    "garObjectId" BIGINT NOT NULL,
    "objectGuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "typeName" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_garObjectId_key" ON "City"("garObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "City_objectGuid_key" ON "City"("objectGuid");

-- CreateIndex
CREATE INDEX "City_regionCode_idx" ON "City"("regionCode");

-- CreateIndex
CREATE INDEX "City_regionCode_name_idx" ON "City"("regionCode", "name");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "customerCityId" UUID;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "cityId" UUID;

-- CreateIndex
CREATE INDEX "User_customerCityId_idx" ON "User"("customerCityId");

-- CreateIndex
CREATE INDEX "Provider_cityId_idx" ON "Provider"("cityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerCityId_fkey" FOREIGN KEY ("customerCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;


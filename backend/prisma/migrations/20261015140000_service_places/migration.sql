-- Места работы услуги: города и области. Старые объявления не переносятся.
CREATE TABLE "ServiceCity" (
    "serviceId" UUID NOT NULL,
    "cityId" UUID NOT NULL,

    CONSTRAINT "ServiceCity_pkey" PRIMARY KEY ("serviceId","cityId")
);

CREATE TABLE "ServiceRegion" (
    "serviceId" UUID NOT NULL,
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,

    CONSTRAINT "ServiceRegion_pkey" PRIMARY KEY ("serviceId","regionCode")
);

CREATE INDEX "ServiceCity_cityId_idx" ON "ServiceCity"("cityId");

CREATE INDEX "ServiceRegion_regionCode_idx" ON "ServiceRegion"("regionCode");

ALTER TABLE "ServiceCity" ADD CONSTRAINT "ServiceCity_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceCity" ADD CONSTRAINT "ServiceCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceRegion" ADD CONSTRAINT "ServiceRegion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

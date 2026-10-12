-- CreateTable
CREATE TABLE "RegionalCapital" (
    "cityId" UUID NOT NULL,

    CONSTRAINT "RegionalCapital_pkey" PRIMARY KEY ("cityId")
);

-- AddForeignKey
ALTER TABLE "RegionalCapital" ADD CONSTRAINT "RegionalCapital_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

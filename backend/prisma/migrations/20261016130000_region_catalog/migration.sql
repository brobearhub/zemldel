-- Справочник субъектов. Имя области больше не собирается DISTINCT-ом по всей "City".
CREATE TABLE "Region" (
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("regionCode")
);

INSERT INTO "Region" ("regionCode", "regionName")
SELECT DISTINCT ON ("regionCode") "regionCode", "regionName"
FROM "City"
WHERE status = 'ACTIVE'
  AND btrim("regionCode") <> ''
  AND btrim("regionName") <> ''
ORDER BY "regionCode", "regionName";

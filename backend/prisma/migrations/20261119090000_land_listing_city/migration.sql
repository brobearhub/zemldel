ALTER TABLE "LandListing" ADD COLUMN "cityId" UUID
    REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LandListing_cityId_status_idx" ON "LandListing"("cityId", "status");

-- Only link an existing address when a complete address component identifies
-- one locality in the parcel's cadastral region. Leave ambiguous addresses editable.
WITH address_parts AS (
    SELECT l.id, split_part(p."cadastralNumber", ':', 1) AS region, lower(trim(part)) AS name
    FROM "LandListing" l
    JOIN "LandParcel" p ON p.id = l."parcelId"
    CROSS JOIN LATERAL unnest(string_to_array(l.address, ',')) AS part
    WHERE l.kind = 'SALE' AND l.address <> ''
), matches AS (
    SELECT DISTINCT a.id, c.id AS city_id
    FROM address_parts a
    JOIN "City" c ON c."regionCode" = a.region AND c.status = 'ACTIVE'
    WHERE (c.level IN (2, 3, 4, 6) OR (c."typeName" = 'г' AND c.level IN (1, 5)))
      AND c."typeName" <> 'автодорога'
      AND a.name IN (lower(c.name), lower(c."typeName" || ' ' || c.name),
                     lower(c."typeName" || '. ' || c.name),
                     CASE WHEN c."typeName" = 'г' THEN lower('город ' || c.name) END)
), unambiguous AS (
    SELECT id, (array_agg(city_id))[1] AS city_id FROM matches GROUP BY id HAVING count(*) = 1
)
UPDATE "LandListing" l SET "cityId" = u.city_id FROM unambiguous u WHERE l.id = u.id;

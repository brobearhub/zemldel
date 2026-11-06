BEGIN;
ALTER TABLE "Service" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Service" SET "images" = ARRAY["image"] WHERE "image" IS NOT NULL AND "image" <> '';
ALTER TABLE "Service" ADD CONSTRAINT "Service_images_limit" CHECK (cardinality("images") <= 10);
COMMIT;

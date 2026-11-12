BEGIN;

ALTER TABLE "Request" ADD COLUMN "number" INTEGER;

CREATE TABLE "RequestNumberCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RequestNumberCounter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RequestNumberCounter_singleton" CHECK ("id" = 1),
    CONSTRAINT "RequestNumberCounter_nonnegative" CHECK ("lastNumber" >= 0)
);

-- Backfill by the event that made a request eligible for a number.
-- Category requests, like unlinked requests, belong to the free-request pool.
WITH numbered AS (
    SELECT "id", ROW_NUMBER() OVER (
        ORDER BY
            CASE WHEN "serviceId" IS NOT NULL THEN "createdAt" ELSE "contractAcceptedAt" END,
            "createdAt",
            "id"
    )::INTEGER AS "number"
    FROM "Request"
    WHERE "serviceId" IS NOT NULL OR "contractAcceptedAt" IS NOT NULL
)
UPDATE "Request" AS request
SET "number" = numbered."number"
FROM numbered
WHERE request."id" = numbered."id";

INSERT INTO "RequestNumberCounter" ("id", "lastNumber")
SELECT 1, COALESCE(MAX("number"), 0) FROM "Request";

CREATE UNIQUE INDEX "Request_number_key" ON "Request"("number");
ALTER TABLE "Request" ADD CONSTRAINT "Request_number_positive" CHECK ("number" > 0);

CREATE FUNCTION "assign_request_number"() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD."number" IS NOT NULL THEN
        IF NEW."number" IS DISTINCT FROM OLD."number" THEN
            RAISE EXCEPTION 'Request numbers cannot be changed';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW."number" IS NOT NULL THEN
        RAISE EXCEPTION 'Request numbers are assigned automatically';
    END IF;

    IF NEW."serviceId" IS NULL AND NEW."contractAcceptedAt" IS NULL THEN
        RETURN NEW;
    END IF;

    -- INSERT ... ON CONFLICT DO NOTHING must not consume another number.
    IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM "Request" WHERE "id" = NEW."id") THEN
        RETURN NEW;
    END IF;

    -- A row lock serializes allocations; rollback also rolls the counter back.
    UPDATE "RequestNumberCounter"
    SET "lastNumber" = "lastNumber" + 1
    WHERE "id" = 1
    RETURNING "lastNumber" INTO NEW."number";

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request number counter is missing';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Request_assign_number"
BEFORE INSERT OR UPDATE OF "number", "serviceId", "contractAcceptedAt" ON "Request"
FOR EACH ROW EXECUTE FUNCTION "assign_request_number"();

COMMIT;

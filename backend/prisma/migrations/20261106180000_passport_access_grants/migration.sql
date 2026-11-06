BEGIN;
CREATE TYPE "PassportAccessKind" AS ENUM ('FORM', 'PHOTO');
CREATE TABLE "PassportAccessGrant" (
 "requestId" UUID NOT NULL,
 "kind" "PassportAccessKind" NOT NULL,
 "passportUserId" UUID NOT NULL,
 "providerId" UUID NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("requestId", "kind"),
 FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("passportUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PassportAccessGrant_passportUserId_expiresAt_idx" ON "PassportAccessGrant"("passportUserId", "expiresAt");
-- A reassignment or terminal state invalidates consent, even if the request is later reopened.
CREATE FUNCTION revoke_passport_access_on_request_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."providerId" IS DISTINCT FROM OLD."providerId"
 OR NEW."customerUserId" IS DISTINCT FROM OLD."customerUserId"
 OR NEW."status"::text IN ('COMPLETED', 'CANCELLED', 'CLOSED') THEN
  INSERT INTO "PassportAccessAudit" ("id", "passportUserId", "action", "actorProviderId", "requestId", "createdAt")
  SELECT gen_random_uuid(), "passportUserId", 'REQUEST_REVOKE_' || "kind"::text, "providerId", "requestId", CURRENT_TIMESTAMP
  FROM "PassportAccessGrant" WHERE "requestId" = NEW.id;
  DELETE FROM "PassportAccessGrant" WHERE "requestId" = NEW.id;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "Request_revoke_passport_access" AFTER UPDATE OF "providerId", "customerUserId", "status" ON "Request"
FOR EACH ROW EXECUTE FUNCTION revoke_passport_access_on_request_change();
COMMIT;

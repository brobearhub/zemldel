BEGIN;
CREATE TABLE "PassportAccessRequest" (
  "requestId" UUID NOT NULL,
  "kind" "PassportAccessKind" NOT NULL,
  "passportUserId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("requestId", "kind"),
  FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("passportUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PassportAccessRequest_passportUserId_createdAt_idx"
  ON "PassportAccessRequest"("passportUserId", "createdAt");

-- Old requests cannot reappear after a reassignment or reopening a closed order.
CREATE FUNCTION cancel_passport_requests_on_request_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."providerId" IS DISTINCT FROM OLD."providerId"
    OR NEW."customerUserId" IS DISTINCT FROM OLD."customerUserId"
    OR NEW."status"::text IN ('COMPLETED', 'CANCELLED', 'CLOSED') THEN
    DELETE FROM "PassportAccessRequest" WHERE "requestId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Request_cancel_passport_requests"
  AFTER UPDATE OF "providerId", "customerUserId", "status" ON "Request"
  FOR EACH ROW EXECUTE FUNCTION cancel_passport_requests_on_request_change();
COMMIT;

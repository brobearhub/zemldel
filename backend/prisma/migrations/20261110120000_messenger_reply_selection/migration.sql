CREATE TABLE "MessengerReplySelection" (
  "id" UUID NOT NULL,
  "connectionId" UUID NOT NULL,
  "deliveryId" UUID NOT NULL,
  "eventOrder" BIGINT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "claimedMessageId" UUID,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessengerReplySelection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MessengerReplySelection_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MessengerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessengerReplySelection_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "MessengerDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MessengerReplySelection_claimedMessageId_key" ON "MessengerReplySelection"("claimedMessageId");
CREATE INDEX "MessengerReplySelection_connectionId_active_idx" ON "MessengerReplySelection"("connectionId", "active");
CREATE UNIQUE INDEX "MessengerReplySelection_active_key" ON "MessengerReplySelection"("connectionId") WHERE "active" = true;

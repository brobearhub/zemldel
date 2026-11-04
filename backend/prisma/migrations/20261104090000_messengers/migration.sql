-- CreateEnum
CREATE TYPE "MessengerPlatform" AS ENUM ('TELEGRAM', 'MAX');

-- CreateEnum
CREATE TYPE "MessengerDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MessengerConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "platform" "MessengerPlatform" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "blockedAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessengerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessengerLinkToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "platform" "MessengerPlatform" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "externalUserId" TEXT,
    "chatId" TEXT,
    "displayName" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "MessengerLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessengerOutbox" (
    "messageId" UUID NOT NULL,
    "expandedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessengerOutbox_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "MessengerDelivery" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "part" INTEGER NOT NULL DEFAULT 0,
    "status" "MessengerDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "externalMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessengerDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessengerConnection_userId_platform_key" ON "MessengerConnection"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "MessengerConnection_platform_externalUserId_key" ON "MessengerConnection"("platform", "externalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MessengerLinkToken_tokenHash_key" ON "MessengerLinkToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "MessengerLinkToken_userId_platform_key" ON "MessengerLinkToken"("userId", "platform");

-- CreateIndex
CREATE INDEX "MessengerOutbox_expandedAt_createdAt_idx" ON "MessengerOutbox"("expandedAt", "createdAt");

-- CreateIndex
CREATE INDEX "MessengerDelivery_status_nextAttemptAt_idx" ON "MessengerDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessengerDelivery_messageId_connectionId_part_key" ON "MessengerDelivery"("messageId", "connectionId", "part");

-- CreateIndex
CREATE UNIQUE INDEX "MessengerDelivery_connectionId_externalMessageId_key" ON "MessengerDelivery"("connectionId", "externalMessageId");

-- AddForeignKey
ALTER TABLE "MessengerConnection" ADD CONSTRAINT "MessengerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessengerLinkToken" ADD CONSTRAINT "MessengerLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessengerOutbox" ADD CONSTRAINT "MessengerOutbox_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessengerDelivery" ADD CONSTRAINT "MessengerDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessengerDelivery" ADD CONSTRAINT "MessengerDelivery_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MessengerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PassportDocument" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "alg" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "iv" BYTEA NOT NULL,
    "tag" BYTEA NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportAccessAudit" (
    "id" UUID NOT NULL,
    "passportUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" UUID,
    "actorProviderId" UUID,
    "serviceRequestId" UUID,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassportAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassportDocument_userId_key" ON "PassportDocument"("userId");

-- CreateIndex
CREATE INDEX "PassportDocument_userId_idx" ON "PassportDocument"("userId");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_passportUserId_createdAt_idx" ON "PassportAccessAudit"("passportUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_actorUserId_createdAt_idx" ON "PassportAccessAudit"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_actorProviderId_createdAt_idx" ON "PassportAccessAudit"("actorProviderId", "createdAt");

-- CreateIndex
CREATE INDEX "PassportAccessAudit_serviceRequestId_createdAt_idx" ON "PassportAccessAudit"("serviceRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "PassportDocument" ADD CONSTRAINT "PassportDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportAccessAudit" ADD CONSTRAINT "PassportAccessAudit_passportUserId_fkey" FOREIGN KEY ("passportUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

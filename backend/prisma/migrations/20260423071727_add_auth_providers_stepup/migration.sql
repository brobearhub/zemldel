-- CreateEnum
CREATE TYPE "AuthProviderKey" AS ENUM ('GOSUSLUGI');

-- CreateTable
CREATE TABLE "UserAuthProviderLink" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerKey" "AuthProviderKey" NOT NULL,
    "externalSubject" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserAuthProviderLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStepUpVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerKey" "AuthProviderKey" NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStepUpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAuthProviderLink_userId_providerKey_idx" ON "UserAuthProviderLink"("userId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthProviderLink_userId_providerKey_key" ON "UserAuthProviderLink"("userId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthProviderLink_providerKey_externalSubject_key" ON "UserAuthProviderLink"("providerKey", "externalSubject");

-- CreateIndex
CREATE INDEX "UserStepUpVerification_userId_providerKey_verifiedAt_idx" ON "UserStepUpVerification"("userId", "providerKey", "verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserStepUpVerification_userId_providerKey_key" ON "UserStepUpVerification"("userId", "providerKey");

-- AddForeignKey
ALTER TABLE "UserAuthProviderLink" ADD CONSTRAINT "UserAuthProviderLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStepUpVerification" ADD CONSTRAINT "UserStepUpVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

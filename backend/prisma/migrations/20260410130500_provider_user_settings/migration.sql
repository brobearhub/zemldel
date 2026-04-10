-- CreateTable
CREATE TABLE "ProviderUserSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "proInboxFilters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderUserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderUserSettings_userId_idx" ON "ProviderUserSettings"("userId");

-- CreateIndex
CREATE INDEX "ProviderUserSettings_providerId_idx" ON "ProviderUserSettings"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUserSettings_userId_providerId_key" ON "ProviderUserSettings"("userId", "providerId");

-- AddForeignKey
ALTER TABLE "ProviderUserSettings" ADD CONSTRAINT "ProviderUserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUserSettings" ADD CONSTRAINT "ProviderUserSettings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;


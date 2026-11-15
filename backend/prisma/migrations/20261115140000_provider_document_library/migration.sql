CREATE TABLE "ProviderDocumentFolder" (
  "id" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderDocumentFolder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProviderDocumentFolder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProviderDocumentFolder_providerId_name_key" ON "ProviderDocumentFolder"("providerId", "name");

CREATE TABLE "ProviderDocument" (
  "id" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "folderId" UUID,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageRelPath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProviderDocument_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProviderDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ProviderDocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProviderDocument_storageRelPath_key" ON "ProviderDocument"("storageRelPath");
CREATE INDEX "ProviderDocument_providerId_folderId_createdAt_idx" ON "ProviderDocument"("providerId", "folderId", "createdAt");

-- CreateEnum
CREATE TYPE "StoryAuthorType" AS ENUM ('USER', 'PROVIDER');

-- CreateTable
CREATE TABLE "Story" (
    "id" UUID NOT NULL,
    "authorType" "StoryAuthorType" NOT NULL,
    "authorUserId" UUID NOT NULL,
    "providerId" UUID,
    "cityId" UUID,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "durationDays" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE INDEX "Story_cityId_publishedAt_idx" ON "Story"("cityId", "publishedAt");

-- CreateIndex
CREATE INDEX "Story_publishedAt_idx" ON "Story"("publishedAt");

-- CreateIndex
CREATE INDEX "Story_authorUserId_publishedAt_idx" ON "Story"("authorUserId", "publishedAt");

-- CreateIndex
CREATE INDEX "Story_providerId_publishedAt_idx" ON "Story"("providerId", "publishedAt");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

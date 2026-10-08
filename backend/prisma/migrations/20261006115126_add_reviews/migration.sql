-- CreateEnum
CREATE TYPE "ReviewDirection" AS ENUM ('CUSTOMER_TO_PROVIDER', 'PROVIDER_TO_CUSTOMER');

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- Ручные рейтинги больше не источник истины.
UPDATE "Service" SET "rating" = NULL, "reviewCount" = COALESCE("reviewCount", 0);

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "ratingSortScore" DOUBLE PRECISION,
ALTER COLUMN "reviewCount" SET NOT NULL,
ALTER COLUMN "reviewCount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customerRating" DOUBLE PRECISION,
ADD COLUMN     "customerReviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "direction" "ReviewDirection" NOT NULL,
    "providerId" UUID NOT NULL,
    "serviceId" UUID,
    "authorUserId" UUID NOT NULL,
    "subjectUserId" UUID,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_serviceId_direction_createdAt_idx" ON "Review"("serviceId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "Review_providerId_direction_createdAt_idx" ON "Review"("providerId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "Review_subjectUserId_direction_idx" ON "Review"("subjectUserId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "Review_requestId_direction_key" ON "Review"("requestId", "direction");

-- CreateIndex
CREATE INDEX "Service_ratingSortScore_idx" ON "Service"("ratingSortScore");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_repliedByUserId_fkey" FOREIGN KEY ("repliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

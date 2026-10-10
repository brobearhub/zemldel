-- AlterTable
ALTER TABLE "StoryReply" ADD COLUMN "authorType" "StoryAuthorType" NOT NULL DEFAULT 'USER';
ALTER TABLE "StoryReply" ADD COLUMN "providerId" UUID;

-- AlterTable
ALTER TABLE "StoryViewEvent" ADD COLUMN "providerId" UUID;

-- AlterTable
ALTER TABLE "StorySave" ADD COLUMN "providerId" UUID;
DROP INDEX "StorySave_userId_storyId_key";

-- AlterTable
ALTER TABLE "StoryProfileOpen" ADD COLUMN "providerId" UUID;

-- AlterTable
ALTER TABLE "StoryAuthorFollow" ADD COLUMN "followerProviderId" UUID;

-- AlterTable
ALTER TABLE "StoryAuthorUnfollow" ADD COLUMN "followerProviderId" UUID;

-- CreateTable
CREATE TABLE "StoryComment" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "authorType" "StoryAuthorType" NOT NULL,
    "authorUserId" UUID NOT NULL,
    "providerId" UUID,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCommentLike" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryComment_storyId_createdAt_idx" ON "StoryComment"("storyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryCommentLike_commentId_userId_key" ON "StoryCommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "StorySave_providerId_removedAt_idx" ON "StorySave"("providerId", "removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorySave_user_story_key" ON "StorySave"("userId", "storyId") WHERE "providerId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "StorySave_provider_story_key" ON "StorySave"("providerId", "storyId") WHERE "providerId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "StoryReply" ADD CONSTRAINT "StoryReply_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryProfileOpen" ADD CONSTRAINT "StoryProfileOpen_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_followerProviderId_fkey" FOREIGN KEY ("followerProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_followerProviderId_fkey" FOREIGN KEY ("followerProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryComment" ADD CONSTRAINT "StoryComment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCommentLike" ADD CONSTRAINT "StoryCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "StoryComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCommentLike" ADD CONSTRAINT "StoryCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

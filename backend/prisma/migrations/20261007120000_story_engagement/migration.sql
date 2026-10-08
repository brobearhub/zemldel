-- AlterTable
ALTER TABLE "User" ADD COLUMN "profilePublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "sourceStoryId" UUID,
ADD COLUMN "withdrawnAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Story_sourceStoryId_idx" ON "Story"("sourceStoryId");
CREATE INDEX "Story_withdrawnAt_idx" ON "Story"("withdrawnAt");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_sourceStoryId_fkey" FOREIGN KEY ("sourceStoryId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "StoryViewEvent" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "userId" UUID,
    "cityId" UUID,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryViewEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorySave" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "StorySave_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryReply" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryProfileOpen" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "userId" UUID,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryProfileOpen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryAuthorFollow" (
    "id" UUID NOT NULL,
    "followerUserId" UUID NOT NULL,
    "targetUserId" UUID,
    "targetProviderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "StoryAuthorFollow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryAuthorUnfollow" (
    "id" UUID NOT NULL,
    "followerUserId" UUID NOT NULL,
    "targetUserId" UUID,
    "targetProviderId" UUID,
    "unfollowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAuthorUnfollow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoryViewEvent_storyId_viewedAt_idx" ON "StoryViewEvent"("storyId", "viewedAt");
CREATE INDEX "StoryViewEvent_storyId_userId_idx" ON "StoryViewEvent"("storyId", "userId");
CREATE INDEX "StoryViewEvent_userId_storyId_idx" ON "StoryViewEvent"("userId", "storyId");

CREATE UNIQUE INDEX "StorySave_userId_storyId_key" ON "StorySave"("userId", "storyId");
CREATE INDEX "StorySave_userId_removedAt_idx" ON "StorySave"("userId", "removedAt");
CREATE INDEX "StorySave_storyId_removedAt_idx" ON "StorySave"("storyId", "removedAt");

CREATE INDEX "StoryReply_storyId_createdAt_idx" ON "StoryReply"("storyId", "createdAt");
CREATE INDEX "StoryProfileOpen_storyId_openedAt_idx" ON "StoryProfileOpen"("storyId", "openedAt");

CREATE UNIQUE INDEX "StoryAuthorFollow_follower_user_key" ON "StoryAuthorFollow"("followerUserId", "targetUserId") WHERE "targetUserId" IS NOT NULL;
CREATE UNIQUE INDEX "StoryAuthorFollow_follower_provider_key" ON "StoryAuthorFollow"("followerUserId", "targetProviderId") WHERE "targetProviderId" IS NOT NULL;
CREATE INDEX "StoryAuthorFollow_followerUserId_removedAt_idx" ON "StoryAuthorFollow"("followerUserId", "removedAt");
CREATE INDEX "StoryAuthorFollow_targetUserId_removedAt_idx" ON "StoryAuthorFollow"("targetUserId", "removedAt");
CREATE INDEX "StoryAuthorFollow_targetProviderId_removedAt_idx" ON "StoryAuthorFollow"("targetProviderId", "removedAt");

CREATE INDEX "StoryAuthorUnfollow_targetUserId_unfollowedAt_idx" ON "StoryAuthorUnfollow"("targetUserId", "unfollowedAt");
CREATE INDEX "StoryAuthorUnfollow_targetProviderId_unfollowedAt_idx" ON "StoryAuthorUnfollow"("targetProviderId", "unfollowedAt");

ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryViewEvent" ADD CONSTRAINT "StoryViewEvent_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorySave" ADD CONSTRAINT "StorySave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryReply" ADD CONSTRAINT "StoryReply_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryReply" ADD CONSTRAINT "StoryReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryProfileOpen" ADD CONSTRAINT "StoryProfileOpen_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryProfileOpen" ADD CONSTRAINT "StoryProfileOpen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAuthorFollow" ADD CONSTRAINT "StoryAuthorFollow_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAuthorUnfollow" ADD CONSTRAINT "StoryAuthorUnfollow_targetProviderId_fkey" FOREIGN KEY ("targetProviderId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

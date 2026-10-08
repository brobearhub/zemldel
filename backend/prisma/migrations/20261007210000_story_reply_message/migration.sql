-- CreateTable
CREATE TABLE "StoryReplyMessage" (
    "id" UUID NOT NULL,
    "storyReplyId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReplyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryReplyMessage_storyReplyId_createdAt_idx" ON "StoryReplyMessage"("storyReplyId", "createdAt");

-- AddForeignKey
ALTER TABLE "StoryReplyMessage" ADD CONSTRAINT "StoryReplyMessage_storyReplyId_fkey" FOREIGN KEY ("storyReplyId") REFERENCES "StoryReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReplyMessage" ADD CONSTRAINT "StoryReplyMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

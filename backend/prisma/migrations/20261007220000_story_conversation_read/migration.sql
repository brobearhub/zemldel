-- CreateTable
CREATE TABLE "StoryConversationRead" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "inboxKey" TEXT NOT NULL,
    "counterpartKey" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryConversationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryConversationRead_userId_inboxKey_idx" ON "StoryConversationRead"("userId", "inboxKey");

-- CreateIndex
CREATE UNIQUE INDEX "StoryConversationRead_userId_inboxKey_counterpartKey_key" ON "StoryConversationRead"("userId", "inboxKey", "counterpartKey");

-- AddForeignKey
ALTER TABLE "StoryConversationRead" ADD CONSTRAINT "StoryConversationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "RequestReminder" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestReminder_requestId_remindAt_idx" ON "RequestReminder"("requestId", "remindAt");

-- CreateIndex
CREATE INDEX "RequestReminder_providerId_remindAt_idx" ON "RequestReminder"("providerId", "remindAt");

-- CreateIndex
CREATE INDEX "RequestReminder_providerId_isDone_remindAt_idx" ON "RequestReminder"("providerId", "isDone", "remindAt");

-- AddForeignKey
ALTER TABLE "RequestReminder" ADD CONSTRAINT "RequestReminder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestReminder" ADD CONSTRAINT "RequestReminder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

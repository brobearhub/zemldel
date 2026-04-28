-- CreateTable
CREATE TABLE "ContractFeedback" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "authorRole" "ContractSignerRole" NOT NULL,
    "authorUserId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractFeedback_contractId_createdAt_idx" ON "ContractFeedback"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractFeedback_authorUserId_createdAt_idx" ON "ContractFeedback"("authorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContractFeedback" ADD CONSTRAINT "ContractFeedback_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ContractInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractFeedback" ADD CONSTRAINT "ContractFeedback_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


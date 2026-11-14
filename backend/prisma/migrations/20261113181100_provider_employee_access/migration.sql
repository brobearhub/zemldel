ALTER TABLE "ProviderTeamInvitation" ADD COLUMN "role" "ProviderMemberRole" NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE "Request" ADD COLUMN "assignedMemberId" UUID;
CREATE INDEX "Request_assignedMemberId_status_idx" ON "Request"("assignedMemberId", "status");
ALTER TABLE "Request" ADD CONSTRAINT "Request_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "ProviderMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

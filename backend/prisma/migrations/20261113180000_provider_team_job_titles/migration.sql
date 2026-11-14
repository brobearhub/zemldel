ALTER TABLE "ProviderMember" ADD COLUMN "jobTitle" VARCHAR(120);

CREATE TABLE "ProviderTeamInvitation" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "acceptedById" UUID,
    "email" TEXT NOT NULL,
    "jobTitle" VARCHAR(120) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderTeamInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderTeamInvitation_tokenHash_key" ON "ProviderTeamInvitation"("tokenHash");
CREATE UNIQUE INDEX "ProviderTeamInvitation_providerId_email_key" ON "ProviderTeamInvitation"("providerId", "email");
CREATE INDEX "ProviderTeamInvitation_invitedById_idx" ON "ProviderTeamInvitation"("invitedById");
CREATE INDEX "ProviderTeamInvitation_acceptedById_idx" ON "ProviderTeamInvitation"("acceptedById");
ALTER TABLE "ProviderTeamInvitation" ADD CONSTRAINT "ProviderTeamInvitation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderTeamInvitation" ADD CONSTRAINT "ProviderTeamInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderTeamInvitation" ADD CONSTRAINT "ProviderTeamInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

import type { Prisma } from '@prisma/client';

export const privateInvitationSelect = {
  id: true,
  email: true,
  jobTitle: true,
  role: true,
  expiresAt: true,
  sentAt: true,
} satisfies Prisma.ProviderTeamInvitationSelect;

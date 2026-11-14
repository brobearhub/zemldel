import type { Prisma } from '@prisma/client';

export const assignedMemberSelect = {
  id: true,
  providerId: true,
  jobTitle: true,
  user: {
    select: { firstName: true, lastName: true, name: true, image: true },
  },
} satisfies Prisma.ProviderMemberSelect;

export function assignedMemberDto(
  member:
    | Prisma.ProviderMemberGetPayload<{ select: typeof assignedMemberSelect }>
    | null
    | undefined,
  providerId: string | null,
) {
  if (!member || member.providerId !== providerId) return null;
  return {
    id: member.id,
    name:
      [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') ||
      member.user.name ||
      'Сотрудник',
    jobTitle: member.jobTitle,
    image: member.user.image,
  };
}

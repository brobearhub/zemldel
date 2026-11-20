import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export const partnerPairKey = (a: string, b: string) => [a, b].sort().join(':');

export async function requirePartnerManager(
  tx: Prisma.TransactionClient,
  userId: string,
  providerId: string,
) {
  const member = await tx.providerMember.findUnique({
    where: { providerId_userId: { providerId, userId } },
    select: {
      role: true,
      status: true,
      user: { select: { systemRole: true, accountKind: true } },
    },
  });
  if (
    !member ||
    member.status !== 'ACTIVE' ||
    member.role === 'EMPLOYEE' ||
    member.user.systemRole === 'PLATFORM_ADMIN' ||
    member.user.accountKind !== 'PROVIDER'
  )
    throw new ForbiddenException(
      'Действие доступно владельцу или менеджеру профиля исполнителя',
    );
}

export async function requirePartnerChatAccess(
  tx: Prisma.TransactionClient,
  userId: string,
  conversation: {
    providerId: string | null;
    partnerProviderId: string | null;
    partnershipId: string | null;
  },
) {
  const partnership = conversation.partnershipId
    ? await tx.providerPartnership.findUnique({
        where: { id: conversation.partnershipId },
      })
    : null;
  if (
    !partnership ||
    partnership.status !== 'ACTIVE' ||
    !conversation.partnerProviderId ||
    partnership.requesterProviderId !== conversation.providerId ||
    partnership.partnerProviderId !== conversation.partnerProviderId
  )
    throw new ForbiddenException(
      'Чат доступен только подтверждённым партнёрам',
    );
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { activeProviderId: true },
  });
  const providerId = user?.activeProviderId;
  if (
    !providerId ||
    ![conversation.providerId, conversation.partnerProviderId].includes(
      providerId,
    )
  )
    throw new ForbiddenException('Переключитесь на профиль участника диалога');
  await requirePartnerManager(tx, userId, providerId);
  return providerId === conversation.providerId
    ? ('provider' as const)
    : ('customer' as const);
}

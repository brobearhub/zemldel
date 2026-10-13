import { ForbiddenException } from '@nestjs/common';
import type { AccountKind, SystemRole } from '@prisma/client';

type AccountActor = {
  accountKind: AccountKind;
  systemRole: SystemRole;
};

/**
 * Why: админ платформы не привязан к типу кабинета,
 * остальные создают provider-профиль только как PROVIDER.
 */
export function assertCanCreateProviderProfile(actor: AccountActor): void {
  if (actor.systemRole === 'PLATFORM_ADMIN') return;
  if (actor.accountKind === 'PROVIDER') return;
  throw new ForbiddenException('Only providers can create a provider profile');
}

/** Why: заявка — действие заказчика, исполнитель её не создаёт. */
export function assertCanCreateCustomerRequest(actor: AccountActor): void {
  if (actor.systemRole === 'PLATFORM_ADMIN') return;
  if (actor.accountKind === 'CUSTOMER') return;
  throw new ForbiddenException('Only customers can create requests');
}

/** Why: менеджером компании может стать только уже зарегистрированный исполнитель. */
export function assertCanJoinProviderTeam(actor: {
  accountKind: AccountKind;
}): void {
  if (actor.accountKind === 'PROVIDER') return;
  throw new ForbiddenException('Only providers can join a provider team');
}

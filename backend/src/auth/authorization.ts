export const SYSTEM_ROLES = ['PLATFORM_ADMIN', 'CUSTOMER'] as const;
export const PROVIDER_MEMBER_ROLES = ['OWNER', 'MANAGER'] as const;
export const PROVIDER_MEMBER_STATUSES = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
] as const;
export const PROVIDER_TYPES = [
  'INDIVIDUAL',
  'SELF_EMPLOYED',
  'SOLE_PROPRIETOR',
  'COMPANY',
] as const;
export const PERSONAL_PROVIDER_TYPES = [
  'INDIVIDUAL',
  'SELF_EMPLOYED',
  'SOLE_PROPRIETOR',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type ProviderMemberRole = (typeof PROVIDER_MEMBER_ROLES)[number];
export type ProviderMemberStatus = (typeof PROVIDER_MEMBER_STATUSES)[number];
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export function isPersonalProviderType(type: ProviderType): boolean {
  return (PERSONAL_PROVIDER_TYPES as readonly ProviderType[]).includes(type);
}

export type AuthCity = {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
};

/** ФИО человека: контактного лица или исполнителя-физлица. У организации его нет. */
export type AuthPerson = {
  lastName: string;
  firstName: string;
  middleName: string | null;
};

export type AuthMembership = {
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerType: ProviderType;
  providerCity: AuthCity | null;
  providerImage: string | null;
  providerPerson: AuthPerson | null;
  role: ProviderMemberRole;
  status: ProviderMemberStatus;
};

export function toAuthPerson(
  legal: {
    lastName: string | null;
    firstName: string | null;
    middleName: string | null;
  } | null,
): AuthPerson | null {
  const lastName = legal?.lastName?.trim();
  const firstName = legal?.firstName?.trim();
  if (!lastName || !firstName) return null;
  return {
    lastName,
    firstName,
    middleName: legal?.middleName?.trim() || null,
  };
}

export type AccountKind = 'CUSTOMER' | 'PROVIDER';

export type AuthorizedUser = {
  id: string;
  email: string;
  name: string | null;
  person: AuthPerson | null;
  image: string | null;
  phone: string | null;
  systemRole: SystemRole;
  accountKind: AccountKind;
  activeProviderId: string | null;
  customerCity: AuthCity | null;
  memberships: AuthMembership[];
};

export type ServiceManagementAction = 'read' | 'create' | 'update' | 'delete';
export type OrderManagementAction = 'read';

export type ServiceManagementContext = {
  actorUserId: string;
  providerId: string | null;
  isPlatformAdmin: boolean;
  providerRole: ProviderMemberRole | null;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
};

export type OrderManagementContext = {
  actorUserId: string;
  providerId: string | null;
  isPlatformAdmin: boolean;
  providerRole: ProviderMemberRole | null;
};

export function getActiveMembership(
  user: Pick<AuthorizedUser, 'activeProviderId' | 'memberships'> | null,
) {
  if (!user) return null;

  if (user.activeProviderId) {
    const active = user.memberships.find(
      (membership) => membership.providerId === user.activeProviderId,
    );
    if (active) return active;
  }

  return user.memberships[0] ?? null;
}

export function canManageServices(
  user: AuthorizedUser,
  action: ServiceManagementAction,
): ServiceManagementContext | null {
  if (user.systemRole === 'PLATFORM_ADMIN') {
    return {
      actorUserId: user.id,
      providerId: user.activeProviderId,
      isPlatformAdmin: true,
      providerRole: null,
      canPublish: true,
      canArchive: true,
      canDelete: true,
    };
  }

  const membership = getActiveMembership(user);
  if (!membership) return null;

  if (
    action === 'read' &&
    (membership.role === 'OWNER' || membership.role === 'MANAGER')
  ) {
    return {
      actorUserId: user.id,
      providerId: membership.providerId,
      isPlatformAdmin: false,
      providerRole: membership.role,
      canPublish: true,
      canArchive: membership.role === 'OWNER',
      canDelete: membership.role === 'OWNER',
    };
  }

  if (
    (action === 'create' || action === 'update') &&
    (membership.role === 'OWNER' || membership.role === 'MANAGER')
  ) {
    return {
      actorUserId: user.id,
      providerId: membership.providerId,
      isPlatformAdmin: false,
      providerRole: membership.role,
      canPublish: true,
      canArchive: membership.role === 'OWNER',
      canDelete: membership.role === 'OWNER',
    };
  }

  if (action === 'delete' && membership.role === 'OWNER') {
    return {
      actorUserId: user.id,
      providerId: membership.providerId,
      isPlatformAdmin: false,
      providerRole: membership.role,
      canPublish: true,
      canArchive: true,
      canDelete: true,
    };
  }

  return null;
}

export function canManageOrders(
  user: AuthorizedUser,
  action: OrderManagementAction,
): OrderManagementContext | null {
  if (user.systemRole === 'PLATFORM_ADMIN') {
    return {
      actorUserId: user.id,
      providerId: user.activeProviderId,
      isPlatformAdmin: true,
      providerRole: null,
    };
  }

  const membership = getActiveMembership(user);
  if (!membership) return null;

  if (
    action === 'read' &&
    (membership.role === 'OWNER' || membership.role === 'MANAGER')
  ) {
    return {
      actorUserId: user.id,
      providerId: membership.providerId,
      isPlatformAdmin: false,
      providerRole: membership.role,
    };
  }

  return null;
}

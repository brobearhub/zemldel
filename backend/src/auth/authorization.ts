export const SYSTEM_ROLES = ['PLATFORM_ADMIN', 'CUSTOMER'] as const;
export const PROVIDER_MEMBER_ROLES = ['OWNER', 'MANAGER'] as const;
export const PROVIDER_MEMBER_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED'] as const;
export const PROVIDER_TYPES = ['SELF_EMPLOYED', 'COMPANY'] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type ProviderMemberRole = (typeof PROVIDER_MEMBER_ROLES)[number];
export type ProviderMemberStatus = (typeof PROVIDER_MEMBER_STATUSES)[number];
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export type AuthCity = {
  id: string;
  name: string;
  regionCode: string;
  regionName: string;
};

export type AuthMembership = {
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerType: ProviderType;
  providerCity: AuthCity | null;
  role: ProviderMemberRole;
  status: ProviderMemberStatus;
};

export type AuthorizedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  systemRole: SystemRole;
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

export function getActiveMembership(user: Pick<AuthorizedUser, 'activeProviderId' | 'memberships'> | null) {
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

  if (action === 'read' && (membership.role === 'OWNER' || membership.role === 'MANAGER')) {
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

  if ((action === 'create' || action === 'update') && (membership.role === 'OWNER' || membership.role === 'MANAGER')) {
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

  if (action === 'read' && (membership.role === 'OWNER' || membership.role === 'MANAGER')) {
    return {
      actorUserId: user.id,
      providerId: membership.providerId,
      isPlatformAdmin: false,
      providerRole: membership.role,
    };
  }

  return null;
}

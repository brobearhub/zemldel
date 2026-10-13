import { AbilityBuilder, createMongoAbility, subject, type AnyMongoAbility } from "@casl/ability";

export const SYSTEM_ROLES = ["PLATFORM_ADMIN", "CUSTOMER"] as const;
export const PROVIDER_MEMBER_ROLES = ["OWNER", "MANAGER"] as const;
export const PROVIDER_MEMBER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED"] as const;
export const PROVIDER_TYPES = ["INDIVIDUAL", "SELF_EMPLOYED", "SOLE_PROPRIETOR", "COMPANY"] as const;
export const AUTH_PROVIDER_KEYS = ["GOSUSLUGI"] as const;

export const ACCOUNT_KINDS = ["CUSTOMER", "PROVIDER"] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type AccountKind = (typeof ACCOUNT_KINDS)[number];
export type ProviderMemberRole = (typeof PROVIDER_MEMBER_ROLES)[number];
export type ProviderMemberStatus = (typeof PROVIDER_MEMBER_STATUSES)[number];
export type ProviderType = (typeof PROVIDER_TYPES)[number];
export type AuthProviderKey = (typeof AUTH_PROVIDER_KEYS)[number];

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
  email?: string | null;
  name?: string | null;
  image?: string | null;
  phone?: string | null;
  systemRole: SystemRole;
  accountKind?: AccountKind;
  activeProviderId: string | null;
  customerCity: AuthCity | null;
  memberships: AuthMembership[];
  linkedAuthProviders?: AuthProviderKey[];
  stepUpVerifiedAt?: Partial<Record<AuthProviderKey, string>>;
};

export type AppAction = "manage" | "read" | "create" | "update" | "delete";
export type AppSubject = "Platform" | "Provider" | "ProviderMember" | "Profile" | "Service" | "all";
export type AppAbility = AnyMongoAbility;

/** Why: старая сессия без поля не должна открыть создание кабинета исполнителя. */
export function resolveAccountKind(
  user: Pick<AuthorizedUser, "accountKind"> | null | undefined,
): AccountKind {
  return user?.accountKind === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
}

export function getActiveMembership(user: Pick<AuthorizedUser, "activeProviderId" | "memberships"> | null) {
  if (!user) return null;

  if (user.activeProviderId) {
    const active = user.memberships.find((membership) => membership.providerId === user.activeProviderId);
    if (active) return active;
  }

  return user.memberships[0] ?? null;
}

export function defineAbilityFor(user: AuthorizedUser | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can("read", "Service");

  if (!user) {
    return build();
  }

  can(["read", "update"], "Profile");

  if (user.systemRole === "PLATFORM_ADMIN") {
    can("manage", "all");
    return build();
  }

  const activeMembership = getActiveMembership(user);
  if (!activeMembership) {
    return build();
  }

  if (activeMembership.role === "OWNER") {
    can("manage", "Provider", { id: activeMembership.providerId });
    can("manage", "ProviderMember", { providerId: activeMembership.providerId });
    can("manage", "Service", { providerId: activeMembership.providerId });
    return build();
  }

  can("read", "Provider", { id: activeMembership.providerId });
  can("read", "ProviderMember", { providerId: activeMembership.providerId });
  can(["read", "create", "update"], "Service", { providerId: activeMembership.providerId });

  return build();
}

export function serviceSubject(providerId: string) {
  return subject("Service", { providerId });
}

import type { DefaultSession } from "next-auth";
import type {
  AccountKind,
  AuthCity,
  AuthMembership,
  AuthPerson,
  AuthProviderKey,
  SystemRole,
} from "@/core/auth/authorization";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      person: AuthPerson | null;
      systemRole: SystemRole;
      accountKind: AccountKind;
      activeProviderId: string | null;
      phone: string | null;
      customerCity: AuthCity | null;
      memberships: AuthMembership[];
      linkedAuthProviders?: AuthProviderKey[];
      stepUpVerifiedAt?: Partial<Record<AuthProviderKey, string>>;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    name?: string | null;
    person?: AuthPerson | null;
    email?: string | null;
    image?: string | null;
    systemRole?: SystemRole;
    accountKind?: AccountKind;
    activeProviderId?: string | null;
    phone?: string | null;
    customerCity?: AuthCity | null;
    memberships?: AuthMembership[];
    linkedAuthProviders?: AuthProviderKey[];
    stepUpVerifiedAt?: Partial<Record<AuthProviderKey, string>>;
  }
}


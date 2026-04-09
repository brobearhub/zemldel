import type { DefaultSession } from "next-auth";
import type { AuthCity, AuthMembership, SystemRole } from "@/core/auth/authorization";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      systemRole: SystemRole;
      activeProviderId: string | null;
      customerCity: AuthCity | null;
      memberships: AuthMembership[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    systemRole?: SystemRole;
    activeProviderId?: string | null;
    customerCity?: AuthCity | null;
    memberships?: AuthMembership[];
  }
}


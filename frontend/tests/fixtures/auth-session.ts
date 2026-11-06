import type { Session } from "next-auth";

export function makeAuthSession(user: Partial<Session["user"]> = {}): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "user-1",
      person: null,
      systemRole: "CUSTOMER",
      accountKind: "CUSTOMER",
      activeProviderId: null,
      phone: null,
      customerCity: null,
      memberships: [],
      ...user,
    },
  };
}

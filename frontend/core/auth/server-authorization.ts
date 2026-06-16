import { NextResponse } from "next/server";
import { getServerAuthSession } from "./next-auth";
import { defineAbilityFor, getActiveMembership, serviceSubject, type AppAction } from "@/core/auth/authorization";
import type { Session } from "next-auth";

/** BFF `/api/admin/*`: только PLATFORM_ADMIN (провайдер ходит в `/api/pro/*`). */
export async function requirePlatformAdminApi(): Promise<
  { ok: true; session: Session } | { ok: false; response: NextResponse }
> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.systemRole !== "PLATFORM_ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}

type ServiceManagementAction = Extract<AppAction, "read" | "create" | "update" | "delete">;

type ServiceManagementContext = {
  actorUserId: string;
  providerId: string | null;
  isPlatformAdmin: boolean;
};

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function getServiceManagementContext(action: ServiceManagementAction) {
  const session = await getServerAuthSession();
  const user = session?.user ?? null;

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  const ability = defineAbilityFor(user);
  const isPlatformAdmin = user.systemRole === "PLATFORM_ADMIN";

  if (isPlatformAdmin) {
    return {
      context: {
        actorUserId: user.id,
        providerId: user.activeProviderId,
        isPlatformAdmin: true,
      } satisfies ServiceManagementContext,
    } as const;
  }

  const activeMembership = getActiveMembership(user);
  if (!activeMembership) {
    return { error: forbidden("Active provider is required") } as const;
  }

  if (!ability.can(action, serviceSubject(activeMembership.providerId))) {
    return { error: forbidden() } as const;
  }

  return {
    context: {
      actorUserId: user.id,
      providerId: activeMembership.providerId,
      isPlatformAdmin: false,
    } satisfies ServiceManagementContext,
  } as const;
}

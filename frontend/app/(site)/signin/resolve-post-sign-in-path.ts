import { isSafeReturnToPath } from "@/core/auth/session-recovery";
import type { AccountKind } from "@/core/auth/authorization";

function isProviderArea(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return (
    pathname.startsWith("/pro/") ||
    pathname === "/providers/new" ||
    pathname.startsWith("/providers/new/")
  );
}

/**
 * Why: пункт меню задаёт returnTo, но кабинет после входа определяется типом аккаунта.
 */
export function resolvePostSignInPath(input: {
  readonly accountKind: AccountKind;
  readonly hasProviderMembership: boolean;
  readonly returnTo: string | null;
}): string {
  if (isSafeReturnToPath(input.returnTo) && /^\/team-invitations\/[A-Za-z0-9_-]{43}$/.test(input.returnTo)) {
    return input.returnTo;
  }
  if (input.accountKind === "PROVIDER") {
    if (input.hasProviderMembership && isSafeReturnToPath(input.returnTo) && isProviderArea(input.returnTo)) {
      return input.returnTo;
    }
    return input.hasProviderMembership ? "/pro/requests/feed" : "/providers/new";
  }

  if (!isSafeReturnToPath(input.returnTo) || isProviderArea(input.returnTo)) {
    return "/profile";
  }

  return input.returnTo;
}

import { isSafeReturnToPath } from "@/core/auth/session-recovery";
import type { AccountKind } from "@/core/auth/authorization";

function isProviderArea(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return (
    pathname === "/pro" ||
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
  if (input.accountKind === "PROVIDER") {
    return input.hasProviderMembership ? "/pro" : "/providers/new";
  }

  if (!isSafeReturnToPath(input.returnTo) || isProviderArea(input.returnTo)) {
    return input.returnTo && isProviderArea(input.returnTo) ? "/profile" : "/";
  }

  return input.returnTo;
}

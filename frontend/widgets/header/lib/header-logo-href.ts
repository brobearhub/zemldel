import { getActiveMembership, resolveAccountKind, type AuthorizedUser } from "@/core/auth/authorization";

/**
 * Why: у исполнителя «домой» — кабинет `/pro`, даже если профиль ещё не создан.
 * Гость и заказчик остаются на публичной главной.
 */
export function resolveHeaderLogoHref(
  user: Pick<AuthorizedUser, "activeProviderId" | "memberships" | "accountKind"> | null,
): "/" | "/pro" {
  if (getActiveMembership(user)) return "/pro";
  if (resolveAccountKind(user) === "PROVIDER") return "/pro";
  return "/";
}

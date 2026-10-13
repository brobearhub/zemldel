import { getActiveMembership, resolveAccountKind, type AuthorizedUser } from "@/core/auth/authorization";

/**
 * Why: у исполнителя с профилем «домой» — кабинет `/pro`.
 * Без профиля логотип возвращает на шаг создания профиля, а не на клиентскую главную.
 */
export function resolveHeaderLogoHref(
  user: Pick<AuthorizedUser, "activeProviderId" | "memberships" | "accountKind"> | null,
): "/" | "/pro" | "/providers/new" {
  if (getActiveMembership(user)) return "/pro";
  if (resolveAccountKind(user) === "PROVIDER") return "/providers/new";
  return "/";
}

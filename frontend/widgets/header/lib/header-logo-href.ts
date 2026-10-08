import { getActiveMembership, type AuthorizedUser } from "@/core/auth/authorization";

/**
 * Why: у провайдера «домой» — кабинет `/pro`, у гостя и заказчика — публичная главная.
 */
export function resolveHeaderLogoHref(
  user: Pick<AuthorizedUser, "activeProviderId" | "memberships"> | null,
): "/" | "/pro" {
  return getActiveMembership(user) ? "/pro" : "/";
}

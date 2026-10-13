const ALLOWED_PATH =
  /^\/(?:providers\/new|terms|privacy|offer)(?:\/|$)/;

/**
 * Исполнитель без профиля остаётся на шаге 2.
 * Админа платформы не запираем: у него может не быть membership.
 */
export function providerWithoutProfileRedirect(input: {
  accountKind: string | null | undefined;
  systemRole: string | null | undefined;
  hasMembership: boolean;
  pathname: string;
}): "/providers/new" | null {
  if (input.systemRole === "PLATFORM_ADMIN") return null;
  if (input.accountKind !== "PROVIDER") return null;
  if (input.hasMembership) return null;
  if (ALLOWED_PATH.test(input.pathname)) return null;
  return "/providers/new";
}

export type ProfileMenuSection = "profile" | "pro" | "admin";

/**
 * Why: пункт меню совпадает с разделом, в котором пользователь уже находится.
 * `/pro/profile` — это кабинет, поэтому проверка кабинета идёт раньше профиля.
 */
export function resolveProfileMenuSection(pathname: string): ProfileMenuSection | null {
  if (pathname === "/pro" || pathname.startsWith("/pro/")) return "pro";
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "profile";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return null;
}

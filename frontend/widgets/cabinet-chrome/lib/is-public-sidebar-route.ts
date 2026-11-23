const PUBLIC_SIDEBAR_PATHS = new Set([
  "/",
  "/about",
  "/for-providers",
  "/pricing",
  "/terms",
  "/privacy",
  "/offer",
  "/consent",
]);

export function isPublicSidebarRoute(pathname: string): boolean {
  return (
    PUBLIC_SIDEBAR_PATHS.has(pathname) ||
    pathname === "/lands" || pathname.startsWith("/lands/") ||
    (/^\/(?:services|service-categories|providers|users|client-invitations|team-invitations)\/[^/]+\/?$/.test(pathname) &&
      pathname !== "/providers/new")
  );
}

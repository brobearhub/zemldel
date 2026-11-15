const PUBLIC_SIDEBAR_PATHS = new Set([
  "/",
  "/about",
  "/pricing",
  "/terms",
  "/privacy",
  "/offer",
  "/consent",
]);

export function isPublicSidebarRoute(pathname: string): boolean {
  return (
    PUBLIC_SIDEBAR_PATHS.has(pathname) ||
    (/^\/(?:services|service-categories|providers|users|team-invitations)\/[^/]+\/?$/.test(pathname) &&
      pathname !== "/providers/new")
  );
}

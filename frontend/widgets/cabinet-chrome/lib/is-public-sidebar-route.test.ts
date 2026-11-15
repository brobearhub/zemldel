import { isPublicSidebarRoute } from "./is-public-sidebar-route";

describe("public provider sidebar routes", () => {
  it.each([
    "/",
    "/about",
    "/pricing",
    "/terms",
    "/privacy",
    "/offer",
    "/consent",
    "/services/example",
    "/service-categories/example",
    "/providers/example",
    "/users/example",
    "/team-invitations/example",
  ])("includes %s", (pathname) => {
    expect(isPublicSidebarRoute(pathname)).toBe(true);
  });

  it.each([
    "/themes",
    "/providers/new",
    "/signin",
    "/signup",
    "/welcome",
    "/forgot-password",
    "/reset-password",
    "/pro/requests/feed",
    "/profile",
    "/admin",
    "/maintenance",
    "/services/example/edit",
    "/unknown",
  ])("excludes %s", (pathname) => {
    expect(isPublicSidebarRoute(pathname)).toBe(false);
  });
});

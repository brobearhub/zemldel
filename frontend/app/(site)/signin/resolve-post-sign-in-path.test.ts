import { describe, expect, it } from "vitest";
import { resolvePostSignInPath } from "./resolve-post-sign-in-path";

describe("resolvePostSignInPath", () => {
  it.each([
    null,
    "/signin",
    "/signup",
    "/welcome",
    "/forgot-password",
    "/forgot-password?email=user%40example.com",
    "/reset-password?token=expired",
    "https://other.test",
  ])("ведёт клиента в личный кабинет без допустимого адреса возврата: %s", (returnTo) => {
    expect(
      resolvePostSignInPath({
        accountKind: "CUSTOMER",
        hasProviderMembership: false,
        returnTo,
      }),
    ).toBe("/profile");
  });

  it.each([true, false])("после восстановления пароля ведёт исполнителя в его кабинет (membership=%s)", (hasProviderMembership) => {
    expect(
      resolvePostSignInPath({
        accountKind: "PROVIDER",
        hasProviderMembership,
        returnTo: "/reset-password?token=expired",
      }),
    ).toBe(hasProviderMembership ? "/pro/requests/feed" : "/providers/new");
  });

  it("ведёт исполнителя без кабинета создавать профиль", () => {
    expect(
      resolvePostSignInPath({
        accountKind: "PROVIDER",
        hasProviderMembership: false,
        returnTo: "/service/1",
      }),
    ).toBe("/providers/new");
  });

  it("ведёт исполнителя с кабинетом в /pro", () => {
    expect(
      resolvePostSignInPath({
        accountKind: "PROVIDER",
        hasProviderMembership: true,
        returnTo: "/profile",
      }),
    ).toBe("/pro/requests/feed");
  });

  it("не пускает клиента в кабинет исполнителя", () => {
    expect(
      resolvePostSignInPath({
        accountKind: "CUSTOMER",
        hasProviderMembership: false,
        returnTo: "/pro/requests/feed",
      }),
    ).toBe("/profile");
  });

  it("возвращает клиента на безопасную страницу", () => {
    expect(
      resolvePostSignInPath({
        accountKind: "CUSTOMER",
        hasProviderMembership: false,
        returnTo: "/service/123?q=1",
      }),
    ).toBe("/service/123?q=1");
  });
  it("returns an authenticated provider to the original request", () => {
    expect(resolvePostSignInPath({accountKind: "PROVIDER", hasProviderMembership: true, returnTo: "/pro/requests/qa?tab=chat"})).toBe("/pro/requests/qa?tab=chat");
  });
  it.each(["https://other.test/pro", "//other.test/pro", "/profile/requests/private"])("does not return a provider to an unsafe or customer path: %s", returnTo => {
    expect(resolvePostSignInPath({accountKind: "PROVIDER", hasProviderMembership: true, returnTo})).toBe("/pro/requests/feed");
  });

});

it("возвращает нового сотрудника к приглашению вместо создания собственного профиля", () => {
  const returnTo = `/team-invitations/${"a".repeat(43)}`;
  expect(resolvePostSignInPath({ accountKind: "PROVIDER", hasProviderMembership: false, returnTo })).toBe(returnTo);
  expect(resolvePostSignInPath({ accountKind: "PROVIDER", hasProviderMembership: true, returnTo })).toBe(returnTo);
  expect(resolvePostSignInPath({ accountKind: "PROVIDER", hasProviderMembership: false, returnTo: "//evil.test/team-invitations/secret" })).toBe("/providers/new");
});

import { describe, expect, it } from "vitest";
import { resolvePostSignInPath } from "./resolve-post-sign-in-path";

describe("resolvePostSignInPath", () => {
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
    ).toBe("/pro");
  });

  it("не пускает клиента в кабинет исполнителя", () => {
    expect(
      resolvePostSignInPath({
        accountKind: "CUSTOMER",
        hasProviderMembership: false,
        returnTo: "/pro",
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
});

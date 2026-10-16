import { describe, expect, it } from "vitest";
import { providerWithoutProfileRedirect } from "./provider-onboarding-gate";

const provider = {
  accountKind: "PROVIDER",
  systemRole: "CUSTOMER",
  hasMembership: false,
};

describe("providerWithoutProfileRedirect", () => {
  it("ведёт исполнителя без профиля на шаг 2", () => {
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/" })).toBe("/providers/new");
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/pro" })).toBe("/providers/new");
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/profile" })).toBe("/providers/new");
  });

  it("оставляет форму, юридические страницы и уже созданный профиль", () => {
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/providers/new" })).toBeNull();
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/terms" })).toBeNull();
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/privacy" })).toBeNull();
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/offer" })).toBeNull();
    expect(providerWithoutProfileRedirect({ ...provider, pathname: "/consent" })).toBeNull();
    expect(
      providerWithoutProfileRedirect({ ...provider, hasMembership: true, pathname: "/pro" }),
    ).toBeNull();
  });

  it("не трогает клиента и администратора", () => {
    expect(
      providerWithoutProfileRedirect({ ...provider, accountKind: "CUSTOMER", pathname: "/" }),
    ).toBeNull();
    expect(
      providerWithoutProfileRedirect({ ...provider, systemRole: "PLATFORM_ADMIN", pathname: "/" }),
    ).toBeNull();
  });
});

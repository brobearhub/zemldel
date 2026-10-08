import { describe, expect, it } from "vitest";
import type { AuthMembership } from "@/core/auth/authorization";
import { resolveHeaderLogoHref } from "./header-logo-href";

const membership: AuthMembership = {
  providerId: "provider-1",
  providerName: "Земадела",
  providerSlug: "zemadela",
  providerType: "SELF_EMPLOYED",
  providerCity: null,
  role: "OWNER",
  status: "ACTIVE",
};

describe("resolveHeaderLogoHref", () => {
  it("ведёт гостя и заказчика на главную", () => {
    expect(resolveHeaderLogoHref(null)).toBe("/");
    expect(resolveHeaderLogoHref({ activeProviderId: null, memberships: [] })).toBe("/");
  });

  it("ведёт провайдера в кабинет", () => {
    expect(
      resolveHeaderLogoHref({
        activeProviderId: "provider-1",
        memberships: [membership],
      }),
    ).toBe("/pro");
  });
});

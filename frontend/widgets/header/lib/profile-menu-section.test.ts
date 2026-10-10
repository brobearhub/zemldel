import { describe, expect, it } from "vitest";
import { resolveProfileMenuSection } from "./profile-menu-section";

describe("resolveProfileMenuSection", () => {
  it("отмечает кабинет профессионала на маршрутах /pro", () => {
    expect(resolveProfileMenuSection("/pro")).toBe("pro");
    expect(resolveProfileMenuSection("/pro/services")).toBe("pro");
    expect(resolveProfileMenuSection("/pro/profile")).toBe("pro");
  });

  it("отмечает мой профиль на маршрутах заказчика", () => {
    expect(resolveProfileMenuSection("/profile")).toBe("profile");
    expect(resolveProfileMenuSection("/profile/requests/1")).toBe("profile");
  });

  it("отмечает админку на маршрутах /admin", () => {
    expect(resolveProfileMenuSection("/admin")).toBe("admin");
    expect(resolveProfileMenuSection("/admin/services/create")).toBe("admin");
  });

  it("не отмечает пункт на публичных страницах", () => {
    expect(resolveProfileMenuSection("/")).toBeNull();
    expect(resolveProfileMenuSection("/providers/studio")).toBeNull();
    expect(resolveProfileMenuSection("/services/1")).toBeNull();
  });
});

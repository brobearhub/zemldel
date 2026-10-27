import { describe, expect, it } from "vitest";
import { formatContactShortName, resolveProviderMenuMode } from "./provider-menu-mode";

describe("resolveProviderMenuMode", () => {
  it("берёт режим из раздела кабинета", () => {
    expect(resolveProviderMenuMode("pro", "contact")).toBe("provider");
    expect(resolveProviderMenuMode("profile", "provider")).toBe("contact");
  });

  it("вне кабинета помнит последний выбор", () => {
    expect(resolveProviderMenuMode(null, "contact")).toBe("contact");
    expect(resolveProviderMenuMode("admin", "contact")).toBe("contact");
  });

  it("без выбора оставляет исполнителя в кабинете", () => {
    expect(resolveProviderMenuMode(null, null)).toBe("provider");
  });
});

describe("formatContactShortName", () => {
  it("сокращает фамилию до инициала", () => {
    expect(formatContactShortName("Павел Усов")).toBe("Павел У.");
    expect(formatContactShortName("  Павел   Иванович  усов ")).toBe("Павел У.");
  });

  it("оставляет одно слово как есть", () => {
    expect(formatContactShortName("Павел")).toBe("Павел");
  });

  it("без имени возвращает null", () => {
    expect(formatContactShortName(null)).toBeNull();
    expect(formatContactShortName("   ")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { providerHeroCaption, providerHeroGreeting, providerHeroIntro } from "./provider-hero-copy";

describe("providerHeroGreeting", () => {
  it("приветствует физлицо и ИП уже собранным именем", () => {
    expect(providerHeroGreeting("Валерия Усова", "INDIVIDUAL")).toBe("Привет! Я Валерия Усова.");
    expect(providerHeroGreeting("ИП Усова В. А.", "SOLE_PROPRIETOR")).toBe("Привет! Я ИП Усова В. А.");
  });

  it("приветствует компанию целиком", () => {
    expect(providerHeroGreeting("Земледел", "COMPANY")).toBe("Привет! Мы Земледел.");
  });
});

describe("providerHeroCaption", () => {
  it("оставляет собранное имя как есть", () => {
    expect(providerHeroCaption("Валерия Усова")).toBe("Валерия Усова");
  });
});

describe("providerHeroIntro", () => {
  it("предпочитает описание подзаголовку", () => {
    expect(providerHeroIntro("Разберусь в ситуации.", "Эксперт")).toBe("Разберусь в ситуации.");
  });

  it("падает на подзаголовок, если описания нет", () => {
    expect(providerHeroIntro(null, "Эксперт")).toBe("Эксперт");
  });

  it("пусто, если нет ни описания, ни подзаголовка", () => {
    expect(providerHeroIntro(null, "")).toBe("");
  });
});

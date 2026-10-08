import { describe, expect, it } from "vitest";
import { providerGivenName, providerHeroCaption, providerHeroGreeting, providerHeroIntro } from "./provider-hero-copy";

describe("providerGivenName", () => {
  it("оставляет «Фамилия Имя»", () => {
    expect(providerGivenName("Усова Валерия")).toBe("Усова Валерия");
  });

  it("отрезает отчество", () => {
    expect(providerGivenName("Усова Валерия Арсеновна")).toBe("Усова Валерия");
  });

  it("оставляет единственное слово как есть", () => {
    expect(providerGivenName("Валерия")).toBe("Валерия");
  });
});

describe("providerHeroGreeting", () => {
  it("приветствует физлицо по фамилии и имени", () => {
    expect(providerHeroGreeting("Усова Валерия", "SELF_EMPLOYED")).toBe("Привет! Я Усова Валерия.");
  });

  it("приветствует компанию целиком", () => {
    expect(providerHeroGreeting("Земледел", "COMPANY")).toBe("Привет! Мы Земледел.");
  });
});

describe("providerHeroCaption", () => {
  it("подписывает полароид фамилией и именем", () => {
    expect(providerHeroCaption("Усова Валерия Арсеновна", "SELF_EMPLOYED")).toBe("Усова Валерия");
  });

  it("для компании оставляет название целиком", () => {
    expect(providerHeroCaption("Земледел", "COMPANY")).toBe("Земледел");
  });
});

describe("providerHeroIntro", () => {
  it("предпочитает описание подзаголовку", () => {
    expect(providerHeroIntro("Разберусь в ситуации.", "Эксперт")).toBe("Разберусь в ситуации.");
  });

  it("падает на подзаголовок, если описания нет", () => {
    expect(providerHeroIntro(null, "Эксперт")).toBe("Эксперт");
  });
});

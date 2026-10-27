import { describe, expect, it } from "vitest";
import { buildLlmsTxt, isLlmsTxtPublic } from "./llms-txt";

describe("isLlmsTxtPublic", () => {
  it("открывает файл только на боевом домене", () => {
    expect(isLlmsTxtPublic("https://zemledelpro.ru")).toBe(true);
    expect(isLlmsTxtPublic("https://zemledelpro.ru/")).toBe(true);
    expect(isLlmsTxtPublic("https://www.zemledelpro.ru")).toBe(true);
    expect(isLlmsTxtPublic("http://localhost:4000")).toBe(false);
    expect(isLlmsTxtPublic("https://novagor.ru")).toBe(false);
    expect(isLlmsTxtPublic("не адрес")).toBe(false);
  });
});

describe("buildLlmsTxt", () => {
  it("собирает публичный индекс с абсолютными ссылками и корневыми категориями", () => {
    const text = buildLlmsTxt("https://novagor.ru/", [
      { id: "root-1", name: "Межевание", parentId: null },
      { id: "child-1", name: "Уточнение границ", parentId: "root-1" },
      { id: " ", name: "Пустая", parentId: null },
    ]);

    expect(text.startsWith("# Земледел")).toBe(true);
    expect(text).toContain("[Главная](https://novagor.ru):");
    expect(text).toContain("[Межевание](https://novagor.ru/service-categories/root-1):");
    expect(text).not.toContain("Уточнение границ");
    expect(text).not.toContain("Пустая");
    expect(text).toContain("/sitemap.xml");
  });

  it("оставляет страницы без категорий и убирает скобки из названия", () => {
    const empty = buildLlmsTxt("https://zemledel.pro", []);
    expect(empty).toContain("[Главная](https://zemledel.pro):");
    expect(empty).toContain("Актуальный список открывается на главной странице.");

    const text = buildLlmsTxt("https://zemledel.pro", [
      { id: "a/b", name: "Кадастр [участок]", parentId: null },
    ]);

    expect(text).not.toContain("Актуальный список открывается на главной странице.");
    expect(text).toContain("[Кадастр участок](https://zemledel.pro/service-categories/a%2Fb):");
    expect(text).toContain("[Оферта на оказание платных услуг](https://zemledel.pro/offer):");
  });
});

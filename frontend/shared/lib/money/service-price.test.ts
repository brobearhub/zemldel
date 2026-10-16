import { describe, expect, it } from "vitest";
import {
  formatServicePriceAmount,
  formatServicePriceStored,
  parseServicePriceAmount,
} from "./service-price";

describe("parseServicePriceAmount", () => {
  it("оставляет только цифры суммы", () => {
    expect(parseServicePriceAmount("15 000 ₽")).toBe("15000");
    expect(parseServicePriceAmount("15000")).toBe("15000");
    expect(parseServicePriceAmount("от 15 000 ₽")).toBe("15000");
  });

  it("для текста без цифр возвращает пустую строку", () => {
    expect(parseServicePriceAmount("Договорная")).toBe("");
    expect(parseServicePriceAmount("")).toBe("");
  });
});

describe("formatServicePriceAmount", () => {
  it("группирует тысячи пробелом", () => {
    expect(formatServicePriceAmount("15000")).toBe("15 000");
    expect(formatServicePriceAmount("15 000")).toBe("15 000");
  });
});

describe("formatServicePriceStored", () => {
  it("собирает строку для карточки без приставки «от»", () => {
    expect(formatServicePriceStored("15000")).toBe("15 000 ₽");
    expect(formatServicePriceStored("")).toBe("");
  });
});

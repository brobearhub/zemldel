import { describe, expect, it } from "vitest";
import {
  INVALID_CONTACT_PHONE_MESSAGE,
  formatRuPhoneInput,
  normalizeContactPhoneInput,
  ruPhoneDigits,
} from "./contact-phone";

describe("normalizeContactPhoneInput", () => {
  it("очищает пустой ввод", () => {
    expect(normalizeContactPhoneInput("  ")).toEqual({ phone: null, error: null });
  });

  it("принимает российский номер", () => {
    expect(normalizeContactPhoneInput("+7 (900) 000-00-00")).toEqual({
      phone: "+7 (900) 000-00-00",
      error: null,
    });
  });

  it("отклоняет текст без достаточного числа цифр", () => {
    expect(normalizeContactPhoneInput("позвоните мне")).toEqual({
      phone: null,
      error: INVALID_CONTACT_PHONE_MESSAGE,
    });
  });
});

describe("formatRuPhoneInput", () => {
  it("подставляет +7 к первой цифре", () => {
    expect(formatRuPhoneInput("9")).toBe("+7 9");
    expect(formatRuPhoneInput("")).toBe("+7 ");
  });

  it("форматирует номер по маске и обрезает лишние цифры", () => {
    expect(formatRuPhoneInput("+7 9123456789999")).toBe("+7 912 345-67-89");
  });

  it("не теряет первую цифру при лишнем вводе после полного номера", () => {
    expect(formatRuPhoneInput("+7 812 345-67-891")).toBe("+7 812 345-67-89");
  });

  it("не даёт стереть префикс", () => {
    expect(formatRuPhoneInput("+7")).toBe("+7 ");
  });

  it("убирает код страны у вставленного номера", () => {
    expect(formatRuPhoneInput("8 (912) 345-67-89")).toBe("+7 912 345-67-89");
    expect(formatRuPhoneInput("79123456789")).toBe("+7 912 345-67-89");
  });

  it("понимает уже сохранённый номер в другом формате", () => {
    expect(formatRuPhoneInput("+7 (900) 000-00-00")).toBe("+7 900 000-00-00");
  });
});

describe("ruPhoneDigits", () => {
  it("возвращает пустую строку для одного префикса", () => {
    expect(ruPhoneDigits("+7 ")).toBe("");
    expect(ruPhoneDigits("+7 912 345-67-89")).toBe("9123456789");
  });
});

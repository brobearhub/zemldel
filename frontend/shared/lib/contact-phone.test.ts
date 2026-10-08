import { describe, expect, it } from "vitest";
import { INVALID_CONTACT_PHONE_MESSAGE, normalizeContactPhoneInput } from "./contact-phone";

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

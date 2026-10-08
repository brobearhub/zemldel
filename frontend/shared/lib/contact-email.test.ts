import { describe, expect, it } from "vitest";
import { INVALID_CONTACT_EMAIL_MESSAGE, normalizeContactEmailInput } from "./contact-email";

describe("normalizeContactEmailInput", () => {
  it("очищает пустой ввод", () => {
    expect(normalizeContactEmailInput("  ")).toEqual({ email: null, error: null });
  });

  it("принимает обычный адрес", () => {
    expect(normalizeContactEmailInput("owner@example.com")).toEqual({
      email: "owner@example.com",
      error: null,
    });
  });

  it("отклоняет строку без домена", () => {
    expect(normalizeContactEmailInput("не email")).toEqual({
      email: null,
      error: INVALID_CONTACT_EMAIL_MESSAGE,
    });
  });
});

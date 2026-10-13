import { describe, expect, it } from "vitest";
import { hasSignupFieldErrors, validateSignupForm } from "./validate-signup-form";

const valid = {
  name: "Анна",
  email: "anna@example.com",
  password: "secret1",
  confirmPassword: "secret1",
  hasCity: true,
  termsPrivacyAccepted: true,
  consentAccepted: true,
};

describe("validateSignupForm", () => {
  it("пропускает заполненную форму", () => {
    const errors = validateSignupForm(valid);
    expect(hasSignupFieldErrors(errors)).toBe(false);
  });

  it("подсвечивает пустые поля и короткий пароль", () => {
    const errors = validateSignupForm({
      ...valid,
      name: "  ",
      email: "abc",
      password: "123",
      confirmPassword: "",
      hasCity: false,
      termsPrivacyAccepted: false,
      consentAccepted: false,
    });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.confirmPassword).toBeTruthy();
    expect(errors.city).toBe("Выберите город");
    expect(errors.legal).toBeTruthy();
  });
});

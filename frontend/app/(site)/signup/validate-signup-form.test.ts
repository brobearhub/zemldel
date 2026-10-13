import { describe, expect, it } from "vitest";
import { hasSignupFieldErrors, validateSignupForm } from "./validate-signup-form";

const customer = {
  accountKind: "CUSTOMER" as const,
  name: "Анна",
  email: "anna@example.com",
  password: "secret1",
  confirmPassword: "secret1",
  hasCity: true,
  termsPrivacyAccepted: true,
  consentAccepted: true,
};

describe("validateSignupForm", () => {
  it("пропускает заполненную форму клиента", () => {
    const errors = validateSignupForm(customer);
    expect(hasSignupFieldErrors(errors)).toBe(false);
  });

  it("у клиента подсвечивает имя, город и короткий пароль", () => {
    const errors = validateSignupForm({
      ...customer,
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

  it("у исполнителя не требует имя и город", () => {
    const errors = validateSignupForm({
      ...customer,
      accountKind: "PROVIDER",
      name: "",
      hasCity: false,
    });
    expect(errors.name).toBeNull();
    expect(errors.city).toBeNull();
    expect(hasSignupFieldErrors(errors)).toBe(false);
  });
});

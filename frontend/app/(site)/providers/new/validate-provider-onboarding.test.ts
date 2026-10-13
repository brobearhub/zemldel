import { describe, expect, it } from "vitest";
import { hasProviderOnboardingFieldErrors, validateProviderOnboarding } from "./validate-provider-onboarding";

const cityId = "11111111-1111-4111-8111-111111111111";

describe("validateProviderOnboarding", () => {
  it("требует выбрать тип", () => {
    const errors = validateProviderOnboarding({
      type: null,
      cityId,
      lastName: "",
      firstName: "",
      legalName: "",
      inn: "",
      ogrn: "",
      contactLastName: "",
      contactFirstName: "",
    });
    expect(errors.type).toBeTruthy();
  });

  it("для самозанятого проверяет ИНН из 12 цифр и не требует отчество", () => {
    const valid = validateProviderOnboarding({
      type: "SELF_EMPLOYED",
      cityId,
      lastName: "Петров",
      firstName: "Иван",
      legalName: "",
      inn: "123456789012",
      ogrn: "",
      contactLastName: "",
      contactFirstName: "",
    });
    expect(hasProviderOnboardingFieldErrors(valid)).toBe(false);

    const invalid = validateProviderOnboarding({
      type: "SELF_EMPLOYED",
      cityId,
      lastName: "Петров",
      firstName: "Иван",
      legalName: "",
      inn: "123",
      ogrn: "",
      contactLastName: "",
      contactFirstName: "",
    });
    expect(invalid.inn).toBe("ИНН — 12 цифр");
  });

  it("для организации проверяет ИНН, ОГРН и контакт", () => {
    const errors = validateProviderOnboarding({
      type: "COMPANY",
      cityId,
      lastName: "",
      firstName: "",
      legalName: "",
      inn: "123456789012",
      ogrn: "12",
      contactLastName: "",
      contactFirstName: "Иван",
    });
    expect(errors.legalName).toBeTruthy();
    expect(errors.inn).toBe("ИНН организации — 10 цифр");
    expect(errors.ogrn).toBe("ОГРН — 13 цифр");
    expect(errors.contactLastName).toBeTruthy();
    expect(errors.contactFirstName).toBeUndefined();
  });
});

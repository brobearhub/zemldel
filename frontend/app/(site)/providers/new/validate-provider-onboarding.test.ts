import { describe, expect, it } from "vitest";
import { hasProviderOnboardingFieldErrors, validateProviderOnboarding } from "./validate-provider-onboarding";

const cityId = "11111111-1111-4111-8111-111111111111";

describe("validateProviderOnboarding", () => {
  it("требует выбрать тип", () => {
    const errors = validateProviderOnboarding({
      jobTitle: "Кадастровый инженер",
      type: null,
      cityId,
      lastName: "",
      firstName: "",
      legalName: "",
      contactLastName: "",
      contactFirstName: "",
    });
    expect(errors.type).toBeTruthy();
  });

  it("для самозанятого достаточно фамилии, имени и города", () => {
    const valid = validateProviderOnboarding({
      jobTitle: "Кадастровый инженер",
      type: "SELF_EMPLOYED",
      cityId,
      lastName: "Петров",
      firstName: "Иван",
      legalName: "",
      contactLastName: "",
      contactFirstName: "",
    });
    expect(hasProviderOnboardingFieldErrors(valid)).toBe(false);
    expect(valid).not.toHaveProperty("inn");
    expect(valid).not.toHaveProperty("ogrn");
  });

  it("для организации требует наименование и контакт, но не реквизиты", () => {
    const errors = validateProviderOnboarding({
      jobTitle: "Кадастровый инженер",
      type: "COMPANY",
      cityId,
      lastName: "",
      firstName: "",
      legalName: "",
      contactLastName: "",
      contactFirstName: "Иван",
    });
    expect(errors.legalName).toBeTruthy();
    expect(errors).not.toHaveProperty("inn");
    expect(errors).not.toHaveProperty("ogrn");
    expect(errors.contactLastName).toBeTruthy();
    expect(errors.contactFirstName).toBeUndefined();
  });
});

export type ProviderOnboardingType = "INDIVIDUAL" | "SELF_EMPLOYED" | "SOLE_PROPRIETOR" | "COMPANY";

export type ProviderOnboardingFieldErrors = Partial<
  Record<
    | "jobTitle"
    | "type"
    | "cityId"
    | "lastName"
    | "firstName"
    | "legalName"
    | "contactLastName"
    | "contactFirstName",
    string
  >
>;

export function validateProviderOnboarding(input: {
  jobTitle: string;
  type: ProviderOnboardingType | null;
  cityId: string | null;
  lastName: string;
  firstName: string;
  legalName: string;
  contactLastName: string;
  contactFirstName: string;
}): ProviderOnboardingFieldErrors {
  const errors: ProviderOnboardingFieldErrors = {};
  if (!input.type) {
    errors.type = "Выберите тип профиля";
    return errors;
  }
  if (!input.jobTitle.trim()) errors.jobTitle = "Укажите должность";
  else if (input.jobTitle.trim().length > 120) errors.jobTitle = "Должность должна быть не длиннее 120 символов";
  if (!input.cityId) errors.cityId = "Выберите город";

  if (input.type === "COMPANY") {
    if (!input.legalName.trim()) errors.legalName = "Укажите полное наименование";
    if (!input.contactLastName.trim()) errors.contactLastName = "Укажите фамилию";
    if (!input.contactFirstName.trim()) errors.contactFirstName = "Укажите имя";
    return errors;
  }

  if (!input.lastName.trim()) errors.lastName = "Укажите фамилию";
  if (!input.firstName.trim()) errors.firstName = "Укажите имя";
  return errors;
}

export function hasProviderOnboardingFieldErrors(errors: ProviderOnboardingFieldErrors) {
  return Object.values(errors).some(Boolean);
}

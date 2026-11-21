import { INVALID_CONTACT_EMAIL_MESSAGE, normalizeContactEmailInput } from "@/shared/lib/contact-email";

export const SIGNUP_PASSWORD_MIN_LENGTH = 6;
export const DUPLICATE_EMAIL_MESSAGE = "Этот email уже зарегистрирован";

export type SignupFieldErrors = {
  name: string | null;
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
  city: string | null;
  legal: string | null;
};

const EMPTY_ERRORS: SignupFieldErrors = {
  name: null,
  email: null,
  password: null,
  confirmPassword: null,
  city: null,
  legal: null,
};

export function validateSignupForm(input: {
  accountKind: "CUSTOMER" | "PROVIDER";
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  hasCity: boolean;
  termsPrivacyAccepted: boolean;
  consentAccepted: boolean;
}): SignupFieldErrors {
  const errors = { ...EMPTY_ERRORS };
  const isCustomer = input.accountKind === "CUSTOMER";
  if (isCustomer && !input.name.trim()) errors.name = "Укажите имя";
  if (!normalizeContactEmailInput(input.email).email) errors.email = INVALID_CONTACT_EMAIL_MESSAGE;
  if (input.password.length < SIGNUP_PASSWORD_MIN_LENGTH) {
    errors.password = "Пароль должен быть не короче 6 символов";
  }
  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "Пароль должен совпадать";
  }
  if (isCustomer && !input.hasCity) errors.city = "Выберите город";
  if (!input.termsPrivacyAccepted || !input.consentAccepted) {
    errors.legal = "Чтобы продолжить, примите правила сервиса и дайте согласие на обработку персональных данных";
  }
  return errors;
}

export function hasSignupFieldErrors(errors: SignupFieldErrors) {
  return Object.values(errors).some(Boolean);
}

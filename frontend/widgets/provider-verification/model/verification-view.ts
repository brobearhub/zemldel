export type ProviderVerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type ProviderVerificationView = {
  providerType: "INDIVIDUAL" | "SELF_EMPLOYED" | "SOLE_PROPRIETOR" | "COMPANY";
  status: ProviderVerificationStatus;
  verifiedAt: string | null;
  rejectReason: string | null;
  submittedAt: string | null;
  available: boolean;
  prefill: {
    lastName: string;
    firstName: string;
    middleName: string;
    legalName: string;
    inn: string;
    ogrn: string;
  };
};

export function formatVerificationDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}

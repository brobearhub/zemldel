export type VerificationQueueItem = {
  id: string;
  submittedAt: string;
  type: string;
  displayName: string;
  inn: string | null;
  ogrn: string | null;
  fnsStatus: string | null;
  fnsLabel: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  overdue: boolean;
};

export type VerificationQueue = {
  items: VerificationQueueItem[];
  pendingCount: number;
};

export type VerificationCard = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  decidedAt: string | null;
  rejectReason: string | null;
  type: string;
  displayName: string;
  requisites: {
    fullName: string | null;
    legalName: string | null;
    inn: string | null;
    ogrn: string | null;
  };
  provider: {
    id: string;
    name: string;
    cityName: string | null;
    verificationStatus: string;
  };
  fns: {
    status: string | null;
    label: string;
    checkedAt: string | null;
    source: string | null;
    available: boolean;
    manualCheckedAt: string | null;
    manualCheckedByName: string | null;
  };
  history: Array<{
    id: string;
    submittedAt: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    decidedAt: string | null;
    rejectReason: string | null;
    decidedByName: string | null;
    fnsManualCheckedAt: string | null;
    fnsManualCheckedByName: string | null;
  }>;
};

export function fnsSiteUrl(providerType: string) {
  if (providerType === "SELF_EMPLOYED") return "https://npd.nalog.ru/check-status/";
  return "https://egrul.nalog.ru/index.html";
}

/** ИП — ОГРНИП, организация — ОГРН, самозанятый и физлицо номер не имеют. */
export function registrationNumberLabel(providerType: string): "ОГРНИП" | "ОГРН" | null {
  if (providerType === "SOLE_PROPRIETOR") return "ОГРНИП";
  if (providerType === "COMPANY") return "ОГРН";
  return null;
}

export const PROVIDER_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "Физлицо",
  SELF_EMPLOYED: "Самозанятый",
  SOLE_PROPRIETOR: "ИП",
  COMPANY: "Организация",
};

export const REQUEST_STATUS_LABEL: Record<VerificationQueueItem["status"], string> = {
  PENDING: "На проверке",
  APPROVED: "Подтверждена",
  REJECTED: "Отклонена",
};

export const REJECT_REASON_TEMPLATES = [
  "ФИО не совпадает с владельцем ИНН",
  "ИНН не найден в реестре",
  "Организация/ИП прекращены",
  "Реквизиты неполные или с ошибкой",
  "Не является плательщиком НПД",
] as const;

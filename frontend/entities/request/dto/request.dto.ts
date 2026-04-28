export type RequestSubjectType = "FREEFORM" | "CATEGORY" | "SERVICE";

export type RequestStatus =
  | "NEW"
  | "DISCUSSING"
  | "TERMS_AGREED"
  | "PROVIDER_SELECTED"
  | "CONTRACT_ACCEPTED"
  | "LOCKED"
  | "ACCEPTANCE_PENDING"
  | "ACCEPTED"
  | "ACTIVE"
  | "SERVICE_RENDERED"
  | "PAYMENT_PENDING"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export const ORDER_EXECUTION_STATUSES = [
  "CONTRACT_ACCEPTED",
  "PAYMENT_PENDING",
  "PAYMENT_PROCESSING",
  "ACTIVE",
  "SERVICE_RENDERED",
  "ACCEPTANCE_PENDING",
  "ACCEPTED",
  "PAID",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly RequestStatus[];

export function isOrderExecutionStatus(status: RequestStatus) {
  return (ORDER_EXECUTION_STATUSES as readonly string[]).includes(status);
}

export const EXCLUSIVE_PROVIDER_PHASE_STATUSES = [
  "PROVIDER_SELECTED",
  ...ORDER_EXECUTION_STATUSES,
] as const satisfies readonly RequestStatus[];

export function isExclusiveProviderPhaseStatus(status: RequestStatus) {
  return (EXCLUSIVE_PROVIDER_PHASE_STATUSES as readonly string[]).includes(status);
}

export type RequestProviderOfferStatus = "SELECTED" | "DECLINED";
export type RequestContractStatus = "DRAFT" | "SENT" | "SIGNED" | "CANCELLED";

export type RequestContractSummaryDto = {
  id: string;
  title: string;
  status: RequestContractStatus;
  requestId: string | null;
  providerId: string | null;
  openCommentsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RequestCustomerOfferDto = {
  providerId: string;
  status: RequestProviderOfferStatus;
};

export type RequestCustomerDto = {
  id: string;
  subjectType: RequestSubjectType;
  status: RequestStatus;
  serviceId: string | null;
  categoryId: string | null;
  message: string | null;
  location: string | null;
  providerId: string | null;
  dealTerms: unknown | null;
  offerVersion: string | null;
  contractAcceptedAt: string | null;
  acceptanceRequestedAt: string | null;
  autoAcceptAt: string | null;
  acceptedAt: string | null;
  selectedProviderIds: string[];
  declinedProviderIds: string[];
  lastSelectionAt: string | null;
  offers: RequestCustomerOfferDto[];
  contract: RequestContractSummaryDto | null;
  requestCityId: string | null;
  lockedAt: string | null;
  serviceTitle: string | null;
  providerName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequestProDto = {
  id: string;
  subjectType: RequestSubjectType;
  serviceId: string | null;
  serviceTitle: string | null;
  categoryId: string | null;
  categoryName: string | null;
  message: string | null;
  location: string | null;
  status: RequestStatus;
  providerId: string | null;
  dealTerms: unknown | null;
  offerVersion: string | null;
  contractAcceptedAt: string | null;
  acceptanceRequestedAt: string | null;
  autoAcceptAt: string | null;
  acceptedAt: string | null;
  offerStatus: RequestProviderOfferStatus | null;
  offerSelectedAt: string | null;
  offerDeclinedAt: string | null;
  requestCityId: string | null;
  lockedAt: string | null;
  conversationsCount: number;
  isLocked: boolean;
  contract: RequestContractSummaryDto | null;
  createdAt: string;
  updatedAt: string;
};

export function getRequestStatusLabel(status: RequestStatus): string {
  switch (status) {
    case "NEW":
      return "Новая";
    case "DISCUSSING":
      return "Обсуждение";
    case "TERMS_AGREED":
      return "Условия согласованы";
    case "PROVIDER_SELECTED":
      return "Исполнитель выбран";
    case "CONTRACT_ACCEPTED":
      return "Договор заключен";
    case "LOCKED":
      return "Взято в работу";
    case "ACTIVE":
      return "В работе";
    case "SERVICE_RENDERED":
      return "Услуга оказана";
    case "ACCEPTANCE_PENDING":
      return "Ожидает принятия";
    case "ACCEPTED":
      return "Принято";
    case "PAYMENT_PENDING":
      return "Ожидает оплаты";
    case "PAYMENT_PROCESSING":
      return "Средства зарезервированы";
    case "PAID":
      return "Выплата исполнителю";
    case "COMPLETED":
      return "Заказ выполнен";
    case "CANCELLED":
      return "Заказ (отменён)";
    case "CLOSED":
      return "Закрыто";
    default: {
      const _exhaustive: never = status;
      return String(_exhaustive);
    }
  }
}

/** Текст для карточки заявки: сообщение клиента или название услуги. */
export function resolveRequestDetailBody(message: string | null, serviceTitle: string | null): string | null {
  const fromMessage = message?.trim();
  if (fromMessage) return fromMessage;
  const fromService = serviceTitle?.trim();
  if (fromService) return fromService;
  return null;
}

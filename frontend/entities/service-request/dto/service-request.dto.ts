export type ServiceRequestSubjectType = "FREEFORM" | "CATEGORY" | "SERVICE";
export type ServiceRequestStatus =
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

export const ORDER_PHASE_STATUSES = [
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
] as const satisfies readonly ServiceRequestStatus[];

export function isServiceRequestOrderStatus(status: ServiceRequestStatus) {
  return (ORDER_PHASE_STATUSES as readonly string[]).includes(status);
}

export type ServiceRequestProviderOfferStatus = "SELECTED" | "DECLINED";

export type ServiceRequestCustomerOfferDto = {
  providerId: string;
  status: ServiceRequestProviderOfferStatus;
};

export type ServiceRequestCustomerDto = {
  id: string;
  subjectType: ServiceRequestSubjectType;
  status: ServiceRequestStatus;
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
  offers: ServiceRequestCustomerOfferDto[];
  requestCityId: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRequestProDto = {
  id: string;
  subjectType: ServiceRequestSubjectType;
  serviceId: string | null;
  serviceTitle: string | null;
  categoryId: string | null;
  categoryName: string | null;
  message: string | null;
  location: string | null;
  status: ServiceRequestStatus;
  providerId: string | null;
  dealTerms: unknown | null;
  offerVersion: string | null;
  contractAcceptedAt: string | null;
  acceptanceRequestedAt: string | null;
  autoAcceptAt: string | null;
  acceptedAt: string | null;
  offerStatus: ServiceRequestProviderOfferStatus | null;
  offerSelectedAt: string | null;
  offerDeclinedAt: string | null;
  requestCityId: string | null;
  lockedAt: string | null;
  conversationsCount: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export function getServiceRequestStatusLabel(status: ServiceRequestStatus): string {
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


export type ServiceRequestSubjectType = "FREEFORM" | "CATEGORY" | "SERVICE";
export type ServiceRequestStatus =
  | "NEW"
  | "DISCUSSING"
  | "LOCKED"
  | "CONVERTED_TO_ORDER"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export type ServiceRequestProviderOfferStatus = "SELECTED" | "DECLINED";

export type ServiceRequestCustomerDto = {
  id: string;
  subjectType: ServiceRequestSubjectType;
  status: ServiceRequestStatus;
  serviceId: string | null;
  categoryId: string | null;
  message: string | null;
  location: string | null;
  providerId: string | null;
  selectedProviderIds: string[];
  declinedProviderIds: string[];
  lastSelectionAt: string | null;
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
    case "LOCKED":
      return "Взято в работу";
    case "CONVERTED_TO_ORDER":
      return "Передано в заказ";
    case "ACTIVE":
      return "Заказ (активный)";
    case "COMPLETED":
      return "Заказ (завершён)";
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


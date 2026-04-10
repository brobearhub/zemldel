export type ServiceRequestSubjectType = "FREEFORM" | "CATEGORY" | "SERVICE";
export type ServiceRequestStatus =
  | "NEW"
  | "DISCUSSING"
  | "LOCKED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export type ServiceRequestPendingInitiator = "CUSTOMER" | "PROVIDER";

export type ServiceRequestCustomerDto = {
  id: string;
  subjectType: ServiceRequestSubjectType;
  status: ServiceRequestStatus;
  serviceId: string | null;
  categoryId: string | null;
  message: string | null;
  location: string | null;
  providerId: string | null;
  pendingProviderId: string | null;
  pendingInitiator: ServiceRequestPendingInitiator | null;
  pendingAt: string | null;
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
  pendingProviderId: string | null;
  pendingInitiator: ServiceRequestPendingInitiator | null;
  pendingAt: string | null;
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


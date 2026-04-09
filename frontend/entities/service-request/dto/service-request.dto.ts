export type ServiceRequestKind = "UNLINKED" | "TEMPLATE" | "SERVICE";
export type ServiceRequestStatus =
  | "NEW"
  | "DISCUSSING"
  | "LOCKED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export type ServiceRequestCustomerDto = {
  id: string;
  kind: ServiceRequestKind;
  status: ServiceRequestStatus;
  message: string | null;
  location: string | null;
  providerId: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRequestProDto = {
  id: string;
  kind: ServiceRequestKind;
  templateId: string | null;
  templateTitle: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  message: string | null;
  location: string | null;
  status: ServiceRequestStatus;
  providerId: string | null;
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


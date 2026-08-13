export type RequestSubjectType = "FREEFORM" | "CATEGORY" | "SERVICE";

export type RequestStatus =
  | "NEW"
  | "DISCUSSING"
  | "TERMS_AGREED"
  | "ACCEPTANCE_PENDING"
  | "ACCEPTED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export const ORDER_EXECUTION_STATUSES = [
  "ACTIVE",
  "ACCEPTANCE_PENDING",
  "ACCEPTED",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly RequestStatus[];

export function isOrderExecutionStatus(status: RequestStatus) {
  return (ORDER_EXECUTION_STATUSES as readonly string[]).includes(status);
}

/** Заявка зафиксирована за исполнителем (фаза заказа/договора и далее). */
export function hasRequestLock(row: { lockedAt: string | null | undefined }): boolean {
  return row.lockedAt != null;
}

/** Фаза «Договор»: lock есть, работы ещё не начаты. */
export function isContractPhase(req: {
  status: RequestStatus;
  lockedAt: string | null | undefined;
}): boolean {
  return hasRequestLock(req) && !isOrderExecutionStatus(req.status);
}

export type RequestProviderOfferStatus = "SELECTED" | "DECLINED";

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
  termsVersion: string | null;
  contractAcceptedAt: string | null;
  acceptanceRequestedAt: string | null;
  autoAcceptAt: string | null;
  acceptedAt: string | null;
  selectedProviderIds: string[];
  declinedProviderIds: string[];
  lastSelectionAt: string | null;
  offers: RequestCustomerOfferDto[];
  requestCityId: string | null;
  lockedAt: string | null;
  serviceTitle: string | null;
  providerName: string | null;
  providerPhone: string | null;
  providerEmail: string | null;
  providerImage: string | null;
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
  termsVersion: string | null;
  contractAcceptedAt: string | null;
  acceptanceRequestedAt: string | null;
  autoAcceptAt: string | null;
  acceptedAt: string | null;
  offerStatus: RequestProviderOfferStatus | null;
  offerSelectedAt: string | null;
  offerDeclinedAt: string | null;
  requestCityId: string | null;
  lockedAt: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerImage: string | null;
  conversationsCount: number;
  isLocked: boolean;
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
    case "ACTIVE":
      return "В работе";
    case "ACCEPTANCE_PENDING":
      return "Ожидает принятия";
    case "ACCEPTED":
      return "Принято";
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

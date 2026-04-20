export type OrderStatus =
  | "CONTRACT_ACCEPTED"
  | "PAYMENT_PENDING"
  | "PAYMENT_PROCESSING"
  | "ACTIVE"
  | "SERVICE_RENDERED"
  | "ACCEPTANCE_PENDING"
  | "ACCEPTED"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED";

export type OrderDto = {
  id: string;
  serviceId: string;
  providerId: string;
  customerUserId: string;
  status: OrderStatus;
  serviceTitle: string;
  providerName: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
  dealTerms: unknown | null;
  acceptanceRequestedAt: string | null;
  autoAcceptAt: string | null;
  acceptedAt: string | null;
};

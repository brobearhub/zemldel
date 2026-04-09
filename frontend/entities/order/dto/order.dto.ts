export type OrderStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

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
};

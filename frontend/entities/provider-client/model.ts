import type {
  RequestStatus,
  RequestProviderWorkStatus,
} from "@/entities/request";

export type ProviderClient = {
  id: string;
  email: string;
  name: string | null;
  customerUserId: string | null;
  status: "CONTACT" | "INVITED" | "CONNECTED";
  source: "MANUAL" | "CONTRACT";
  createdAt: string;
  ordersCount: number;
  lastOrderAt: string | null;
  recentServiceTitles: string[];
  statuses: Partial<Record<RequestStatus, number>>;
};

export const clientStatusLabels: Record<ProviderClient["status"], string> = {
  CONTACT: "Не приглашён",
  INVITED: "Приглашение создано",
  CONNECTED: "Подключён",
};

export type ClientRequest = {
  id: string;
  number: number | null;
  status: RequestStatus;
  message: string | null;
  serviceTitle: string | null;
  createdAt: string;
  providerWorkStatus: RequestProviderWorkStatus | null;
};

export type ProviderClientDetail = ProviderClient & {
  invitationVersion: string | null;
  invitationExpiresAt: string | null;
  requests: ClientRequest[];
};

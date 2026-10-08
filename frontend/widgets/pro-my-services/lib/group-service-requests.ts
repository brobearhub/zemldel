import type { RequestStatus } from "@/entities/request";

type GroupableService = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type GroupableRequest = {
  serviceId: string | null;
  status: RequestStatus;
  createdAt: string;
};

export type ServiceRequestGroup<S extends GroupableService, R extends GroupableRequest> = {
  service: S;
  requests: R[];
};

function createdAtMs(value: string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Why: отмена и закрытие без сделки не входят в шесть фильтров шапки. Завершённые входят. */
function isListedRequestStatus(status: RequestStatus) {
  return status !== "CANCELLED" && status !== "CLOSED";
}

/**
 * Why: одно правило «услуга → её заявки списка» для главной и тестов.
 * Архив, отменённые, закрытые без сделки и заявки без услуги в строки не попадают.
 */
export function groupOpenRequestsByService<S extends GroupableService, R extends GroupableRequest>(
  services: readonly S[],
  requests: readonly R[],
): ServiceRequestGroup<S, R>[] {
  const openByService = new Map<string, R[]>();

  for (const request of requests) {
    if (!request.serviceId || !isListedRequestStatus(request.status)) continue;
    const bucket = openByService.get(request.serviceId) ?? [];
    bucket.push(request);
    openByService.set(request.serviceId, bucket);
  }

  return services
    .filter((service) => service.status !== "ARCHIVED")
    .map((service) => ({
      service,
      requests: [...(openByService.get(service.id) ?? [])].sort(
        (left, right) => createdAtMs(right.createdAt) - createdAtMs(left.createdAt),
      ),
    }));
}

/**
 * Why: заявки без услуги не попадают в карточки «Мои услуги» и живут отдельным разделом.
 */
export function selectOpenFreeRequests<R extends GroupableRequest>(requests: readonly R[]): R[] {
  return requests
    .filter((request) => request.serviceId === null && isListedRequestStatus(request.status))
    .sort((left, right) => createdAtMs(right.createdAt) - createdAtMs(left.createdAt));
}

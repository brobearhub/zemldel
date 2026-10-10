import { getRequestStatusLabel, type RequestProDto, type RequestStatus } from "@/entities/request";

/** Порядок колонок ленты — полный жизненный цикл заявки. */
export const PRO_REQUEST_BOARD_STATUSES = [
  "NEW",
  "DISCUSSING",
  "TERMS_AGREED",
  "ACTIVE",
  "ACCEPTANCE_PENDING",
  "ACCEPTED",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
] as const satisfies readonly RequestStatus[];

type MissingBoardStatus = Exclude<RequestStatus, (typeof PRO_REQUEST_BOARD_STATUSES)[number]>;
const _everyStatusHasColumn: MissingBoardStatus extends never ? true : never = true;
void _everyStatusHasColumn;

/** Колонки, которые видны, пока пользователь не включил остальные статусы. */
export const DEFAULT_ENABLED_PRO_REQUEST_STATUSES: readonly RequestStatus[] = [
  "NEW",
  "DISCUSSING",
  "ACTIVE",
  "ACCEPTANCE_PENDING",
  "ACCEPTED",
  "COMPLETED",
];

export function toggleProRequestStatus(enabled: readonly RequestStatus[], status: RequestStatus): RequestStatus[] {
  return enabled.includes(status) ? enabled.filter((item) => item !== status) : [...enabled, status];
}

export type ProRequestBoardColumn = {
  status: RequestStatus;
  label: string;
  items: RequestProDto[];
};

/** Первая запись с id побеждает: входящие срезы ленты важнее дубля из списка заказов. */
export function mergeProRequestFeedItems(lists: readonly (readonly RequestProDto[])[]): RequestProDto[] {
  const byId = new Map<string, RequestProDto>();
  for (const list of lists) {
    for (const item of list) {
      if (!item?.id || byId.has(item.id)) continue;
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

export function groupProRequestsByStatus(items: readonly RequestProDto[]): ProRequestBoardColumn[] {
  const buckets = new Map<RequestStatus, RequestProDto[]>(
    PRO_REQUEST_BOARD_STATUSES.map((status) => [status, []])
  );

  for (const item of items) {
    buckets.get(item.status)?.push(item);
  }

  return PRO_REQUEST_BOARD_STATUSES.map((status) => ({
    status,
    label: getRequestStatusLabel(status),
    items: buckets.get(status) ?? [],
  }));
}

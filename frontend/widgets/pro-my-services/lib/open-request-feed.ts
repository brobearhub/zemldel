import type { RequestProDto } from "@/entities/request";

/** Defensive filtering for stale cached rows; the API excludes these in SQL. */
export function withoutCompletedRequests(items: readonly RequestProDto[]): RequestProDto[] {
  return items.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(item.status));
}

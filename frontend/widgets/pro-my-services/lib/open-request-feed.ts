import type { RequestProDto } from "@/entities/request";

/** Why: завершённая сделка не входит в ленту. Отсекаем и свежий ответ, и строку из старого кэша. */
export function withoutCompletedRequests(items: readonly RequestProDto[]): RequestProDto[] {
  return items.filter((item) => item.status !== "COMPLETED");
}

import type { RequestProDto } from "@/entities/request";
import {
  isRequestListStageCounts,
  readCachedStageCounts,
  readRequestListCache,
  writeRequestListCache,
  type RequestListQuery,
  type RequestListStageCounts,
} from "./request-list-cache";

export type RequestListFeed = {
  items: RequestProDto[];
  counts: RequestListStageCounts;
};

function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as { error?: unknown; message?: unknown };
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  return "Не удалось загрузить заявки";
}

export async function fetchRequestList(query: RequestListQuery, now = Date.now()): Promise<RequestListFeed> {
  const cachedItems = readRequestListCache(query, now);
  const cachedCounts = readCachedStageCounts(query.serviceId, now);
  if (cachedItems && cachedCounts) return { items: cachedItems, counts: cachedCounts };

  const params = new URLSearchParams({ stage: query.stage });
  if (query.serviceId) params.set("serviceId", query.serviceId);
  else params.set("scope", "free");

  const response = await fetch(`/api/pro/requests/feed?${params.toString()}`);
  const payload = (await response.json().catch(() => null)) as unknown;
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  const items = record && "items" in record ? record.items : null;
  const counts = record && "counts" in record ? record.counts : null;
  if (!response.ok || !Array.isArray(items) || !isRequestListStageCounts(counts)) {
    throw new Error(errorMessage(payload));
  }

  const feed: RequestListFeed = { items: items as RequestProDto[], counts };
  writeRequestListCache(query, feed.items, feed.counts, now);
  return feed;
}

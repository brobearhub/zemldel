import type { RequestProDto } from "@/entities/request";
import { withoutCompletedRequests } from "./open-request-feed";
import { readRequestListCache, writeRequestListCache, type RequestListQuery } from "./request-list-cache";

export type RequestListFeed = {
  items: RequestProDto[];
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
  if (cachedItems) return { items: withoutCompletedRequests(cachedItems) };

  const params = new URLSearchParams();
  if (query.serviceId) params.set("serviceId", query.serviceId);
  else params.set("scope", "free");

  const response = await fetch(`/api/pro/requests/feed?${params.toString()}`);
  const payload = (await response.json().catch(() => null)) as unknown;
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  const items = record && "items" in record ? record.items : null;
  if (!response.ok || !Array.isArray(items)) {
    throw new Error(errorMessage(payload));
  }

  const feed: RequestListFeed = { items: withoutCompletedRequests(items as RequestProDto[]) };
  writeRequestListCache(query, feed.items, now);
  return feed;
}

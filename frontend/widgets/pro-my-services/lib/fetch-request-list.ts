import type { RequestProDto } from "@/entities/request";
import { withoutCompletedRequests } from "./open-request-feed";
import {
  getRequestFeedRetrySeconds,
  RequestFeedRateLimitError,
  setRequestFeedRetryAfter,
} from "./request-feed-rate-limit";
import {
  readRequestListCache,
  writeRequestListCache,
  type RequestListQuery,
  type RequestListFeed,
} from "./request-list-cache";
export type { RequestListFeed } from "./request-list-cache";

function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as { error?: unknown; message?: unknown };
    if (typeof record.error === "string" && record.error.trim())
      return record.error;
    if (typeof record.message === "string" && record.message.trim())
      return record.message;
  }
  return "Не удалось загрузить заявки";
}

export async function fetchRequestList(
  query: RequestListQuery,
  now = Date.now(),
  force = false,
): Promise<RequestListFeed> {
  const cachedItems = readRequestListCache(query, now);
  if (cachedItems && !force) return cachedItems;
  if (getRequestFeedRetrySeconds() > 0) throw new RequestFeedRateLimitError();

  const params = new URLSearchParams();
  if (query.serviceId) params.set("serviceId", query.serviceId);
  else params.set("scope", "free");
  params.set("limit", String(query.limit ?? 3));
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.search) params.set("search", query.search);

  const response = await fetch(`/api/pro/requests/feed?${params.toString()}`, {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    setRequestFeedRetryAfter(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : 60,
    );
    throw new RequestFeedRateLimitError();
  }
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : null;
  const items = record && "items" in record ? record.items : null;
  if (!response.ok || !Array.isArray(items)) {
    throw new Error(errorMessage(payload));
  }

  const metadata = record as Partial<RequestListFeed>;
  if (
    typeof metadata.total !== "number" ||
    typeof metadata.needsReply !== "number" ||
    typeof metadata.hasMore !== "boolean" ||
    (metadata.hasMore
      ? typeof metadata.nextCursor !== "string" || !metadata.nextCursor
      : metadata.nextCursor !== null)
  ) {
    throw new Error("Не удалось загрузить страницы заявок");
  }
  const feed: RequestListFeed = {
    items: withoutCompletedRequests(items as RequestProDto[]),
    total: metadata.total,
    needsReply: metadata.needsReply,
    hasMore: metadata.hasMore,
    nextCursor: metadata.nextCursor!,
  };
  writeRequestListCache(query, feed, now);
  return feed;
}

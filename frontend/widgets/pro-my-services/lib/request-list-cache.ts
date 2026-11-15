import type { RequestProDto } from "@/entities/request";

export const REQUEST_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

export type RequestListQuery = {
  serviceId: string | null;
  search?: string;
  cursor?: string;
  limit?: number;
};

export type RequestListFeed = {
  items: RequestProDto[];
  total: number;
  needsReply: number;
  hasMore: boolean;
  nextCursor: string | null;
};

type CacheEntry = {
  at: number;
  data: RequestListFeed;
};

const cache = new Map<string, CacheEntry>();

function scopeKey(query: RequestListQuery): string {
  return JSON.stringify([
    query.serviceId,
    query.search ?? "",
    query.cursor ?? "",
    query.limit ?? 3,
  ]);
}

export function readRequestListCache(
  query: RequestListQuery,
  now = Date.now(),
): RequestListFeed | null {
  const key = scopeKey(query);
  const entry = cache.get(key);
  if (!entry) return null;
  if (now - entry.at >= REQUEST_LIST_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function writeRequestListCache(
  query: RequestListQuery,
  data: RequestListFeed,
  now = Date.now(),
): void {
  cache.set(scopeKey(query), {
    at: now,
    data: { ...data, items: [...data.items] },
  });
}

export function clearRequestListCache(): void {
  cache.clear();
}

export function invalidateRequestListCache(query: RequestListQuery): void {
  for (const key of cache.keys()) {
    if ((JSON.parse(key) as unknown[])[0] === query.serviceId)
      cache.delete(key);
  }
}

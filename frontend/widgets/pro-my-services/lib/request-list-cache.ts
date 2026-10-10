import type { RequestProDto } from "@/entities/request";

export const REQUEST_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

export type RequestListQuery = {
  serviceId: string | null;
};

type CacheEntry = {
  at: number;
  data: RequestProDto[];
};

const cache = new Map<string, CacheEntry>();

function scopeKey(serviceId: string | null): string {
  return serviceId ?? "free";
}

export function readRequestListCache(query: RequestListQuery, now = Date.now()): RequestProDto[] | null {
  const key = scopeKey(query.serviceId);
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
  data: readonly RequestProDto[],
  now = Date.now(),
): void {
  cache.set(scopeKey(query.serviceId), { at: now, data: [...data] });
}

export function clearRequestListCache(): void {
  cache.clear();
}

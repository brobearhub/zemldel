import type { RequestProDto } from "@/entities/request";
import { REQUEST_LIST_STAGES, type RequestListStage } from "./request-list-stage";

export const REQUEST_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

export type RequestListStageCounts = Record<RequestListStage, number>;

export type RequestListQuery = {
  serviceId: string | null;
  stage: RequestListStage;
};

type CacheEntry = {
  at: number;
  data: RequestProDto[];
};

type CountsEntry = {
  at: number;
  counts: RequestListStageCounts;
};

const cache = new Map<string, CacheEntry>();
const countsCache = new Map<string, CountsEntry>();

function scopeKey(serviceId: string | null): string {
  return serviceId ?? "free";
}

export function requestListCacheKey(query: RequestListQuery): string {
  return `${scopeKey(query.serviceId)}:${query.stage}`;
}

export function readRequestListCache(query: RequestListQuery, now = Date.now()): RequestProDto[] | null {
  const key = requestListCacheKey(query);
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
  counts: RequestListStageCounts,
  now = Date.now(),
): void {
  cache.set(requestListCacheKey(query), { at: now, data: [...data] });
  countsCache.set(scopeKey(query.serviceId), { at: now, counts });
}

export function readCachedStageCounts(serviceId: string | null, now = Date.now()): RequestListStageCounts | null {
  const entry = countsCache.get(scopeKey(serviceId));
  if (!entry) return null;
  if (now - entry.at >= REQUEST_LIST_CACHE_TTL_MS) {
    countsCache.delete(scopeKey(serviceId));
    return null;
  }
  return entry.counts;
}

export function emptyRequestListStageCounts(): RequestListStageCounts {
  return {
    NEW: 0,
    DISCUSSING: 0,
    CONTRACT: 0,
    WORK: 0,
    ACCEPTANCE: 0,
    COMPLETED: 0,
  };
}

export function isRequestListStageCounts(value: unknown): value is RequestListStageCounts {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return REQUEST_LIST_STAGES.every((stage) => typeof record[stage] === "number");
}

export function clearRequestListCache(): void {
  cache.clear();
  countsCache.clear();
}

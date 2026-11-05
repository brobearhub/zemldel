import type { CitySuggestItemDto, RegionalCapitalItemDto } from "@/entities/city";
import { fetchCityJson } from "@/shared/lib/fetch-city-json";

let cached: RegionalCapitalItemDto[] | null = null;
let pending: Promise<RegionalCapitalItemDto[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasSuggestFields(value: Record<string, unknown>): value is CitySuggestItemDto {
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.regionCode === "string" &&
    typeof value.regionName === "string" &&
    typeof value.displayName === "string"
  );
}

function isSuggestItem(value: unknown): value is CitySuggestItemDto {
  return isRecord(value) && hasSuggestFields(value);
}

function isCapitalItem(value: unknown): value is RegionalCapitalItemDto {
  return isRecord(value) && typeof value.featured === "boolean" && hasSuggestFields(value);
}

export function loadRegionalCapitals() {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = fetchCityJson(
    "/api/cities/capitals",
    (payload): payload is RegionalCapitalItemDto[] => Array.isArray(payload) && payload.every(isCapitalItem),
  )
    .then((payload) => {
      cached = payload;
      return payload;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export async function suggestCities(query: string, signal?: AbortSignal) {
  const q = query.trim();
  return fetchCityJson(
    `/api/cities/suggest?q=${encodeURIComponent(q)}&limit=20`,
    (payload): payload is CitySuggestItemDto[] => Array.isArray(payload) && payload.every(isSuggestItem),
    signal,
  );
}

import type { CitySuggestItemDto, RegionalCapitalItemDto } from "@/entities/city";

const REQUEST_TIMEOUT_MS = 8000;

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

  pending = fetch("/api/cities/capitals", { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    .then(async (response) => {
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload) || !payload.every(isCapitalItem)) {
        throw new Error("Не удалось загрузить города");
      }
      cached = payload;
      return payload;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export async function suggestCities(query: string) {
  const q = query.trim();
  const response = await fetch(`/api/cities/suggest?q=${encodeURIComponent(q)}&limit=20`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload) || !payload.every(isSuggestItem)) {
    throw new Error("Не удалось найти города");
  }
  return payload;
}

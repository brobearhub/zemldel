export const SERVICE_PLACES_REQUIRED = 'Выберите город или область';

export type ServicePlaceInput = {
  kind?: string | null;
  cityId?: string | null;
  regionCode?: string | null;
};

export type NormalizedServicePlace =
  | { kind: 'city'; cityId: string }
  | { kind: 'region'; regionCode: string };

export function normalizeServicePlaces(
  inputs: readonly ServicePlaceInput[] | null | undefined,
): { places: NormalizedServicePlace[] } | { error: string } {
  if (!inputs?.length) return { error: SERVICE_PLACES_REQUIRED };

  const places: NormalizedServicePlace[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    if (input.kind === 'city') {
      const cityId = input.cityId?.trim() ?? '';
      if (!cityId) return { error: SERVICE_PLACES_REQUIRED };
      const key = `city:${cityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      places.push({ kind: 'city', cityId });
      continue;
    }

    if (input.kind === 'region') {
      const regionCode = input.regionCode?.trim() ?? '';
      if (!regionCode) return { error: SERVICE_PLACES_REQUIRED };
      const key = `region:${regionCode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      places.push({ kind: 'region', regionCode });
      continue;
    }

    return { error: SERVICE_PLACES_REQUIRED };
  }

  if (!places.length) return { error: SERVICE_PLACES_REQUIRED };
  return { places };
}

/** Явный город выше совпадения только через область. Порядок внутри группы сохраняется. */
export function orderByExplicitCity<T extends { cityIds: readonly string[] }>(
  rows: readonly T[],
  cityId: string,
): T[] {
  const explicit: T[] = [];
  const viaRegion: T[] = [];
  for (const row of rows) {
    if (row.cityIds.includes(cityId)) explicit.push(row);
    else viaRegion.push(row);
  }
  return [...explicit, ...viaRegion];
}

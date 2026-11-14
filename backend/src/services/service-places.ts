import type { Prisma } from '@prisma/client';
import {
  cityLocationKey,
  uniqueCityLocations,
} from '../cities/city-suggest.lib';

export const serviceGeographySelect = {
  allRussia: true,
  regionOrder: true,
  cities: {
    select: {
      city: {
        select: { id: true, name: true, regionCode: true, regionName: true },
      },
    },
    orderBy: { city: { name: 'asc' } },
  },
  regions: {
    select: { regionCode: true, regionName: true },
    orderBy: { regionName: 'asc' },
  },
} satisfies Prisma.ServiceSelect;

export type ServiceGeographyRow = {
  allRussia?: boolean;
  regionOrder?: string[];
  cities: Array<{
    city: { id: string; name: string; regionCode: string; regionName: string };
  }>;
  regions: Array<{ regionCode: string; regionName: string }>;
};

type ServicePlace = {
  kind: 'city' | 'region';
  cityId?: string;
  name: string;
  regionCode: string;
  regionName: string;
};

/** Полный регион заменяет входящие в него города, вся Россия — все места. */
export function uniqueServicePlaces(
  places: readonly ServicePlace[],
): ServicePlace[] {
  const nationwide = places.find(
    (place) => place.kind === 'region' && place.regionCode === 'RU',
  );
  if (nationwide) return [nationwide];
  const regions = new Set(
    places
      .filter((place) => place.kind === 'region')
      .map((place) => place.regionCode),
  );
  const identities = new Set<string>();
  const locations = new Set<string>();
  return places.filter((place) => {
    if (place.kind === 'city' && regions.has(place.regionCode)) return false;
    const identity =
      place.kind === 'city'
        ? `city:${place.cityId}`
        : `region:${place.regionCode}`;
    const location =
      place.kind === 'city' ? `city:${cityLocationKey(place)}` : identity;
    if (identities.has(identity) || locations.has(location)) return false;
    identities.add(identity);
    locations.add(location);
    return true;
  });
}

export function servicePlacesFromRow(row: ServiceGeographyRow): ServicePlace[] {
  if (row.allRussia)
    return [
      {
        kind: 'region',
        name: 'Вся Россия',
        regionCode: 'RU',
        regionName: 'Вся Россия',
      },
    ];
  const order = row.regionOrder ?? [];
  const index = (code: string) =>
    order.includes(code) ? order.indexOf(code) : order.length;
  return uniqueServicePlaces(
    [
      ...row.cities.map(({ city }) => ({
        kind: 'city' as const,
        cityId: city.id,
        name: city.name,
        regionCode: city.regionCode,
        regionName: city.regionName,
      })),
      ...row.regions.map((region) => ({
        kind: 'region' as const,
        name: region.regionName,
        ...region,
      })),
    ].sort((left, right) => index(left.regionCode) - index(right.regionCode)),
  );
}

export const SERVICE_PLACES_REQUIRED = 'Выберите город или область';

export type ServicePlaceInput = {
  kind?: string | null;
  cityId?: string | null;
  regionCode?: string | null;
};

export type NormalizedServicePlace =
  | { kind: 'city'; cityId: string }
  | { kind: 'region'; regionCode: string };

export function uniqueServiceCityIds(
  selectedIds: readonly string[],
  cities: readonly {
    id: string;
    name: string;
    regionCode: string;
    typeName: string;
    level: number;
  }[],
  coveredRegionCodes: readonly string[] = [],
): string[] {
  const covered = new Set(coveredRegionCodes);
  const canonicalIds = new Set(
    uniqueCityLocations(cities)
      .filter((city) => !covered.has(city.regionCode))
      .map((city) => city.id),
  );
  return [...new Set(selectedIds)].filter((id) => canonicalIds.has(id));
}

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

import { displayCityName, shortRegionLabel } from "@/shared/lib/format-city-label";

export type ServicePlace = {
  kind: "city" | "region";
  cityId?: string;
  name: string;
  regionCode: string;
  regionName: string;
};

export type ServicePlaceInput = {
  kind: "city" | "region";
  cityId?: string;
  regionCode?: string;
};

export function placeChipLabel(place: ServicePlace) {
  if (place.kind === "region") return shortRegionLabel(place.regionName || place.name);
  return displayCityName(place.name);
}

export function placeKey(place: Pick<ServicePlace, "kind" | "cityId" | "regionCode">) {
  return place.kind === "city" ? `city:${place.cityId ?? ""}` : `region:${place.regionCode}`;
}

export function placeSelectionKey(place: ServicePlace) {
  const fold = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const region = fold(place.regionCode || shortRegionLabel(place.regionName));
  if (place.kind === "region") return `region:${region}`;
  const name = fold(displayCityName(place.name));
  return name ? `city:${JSON.stringify([name, region])}` : placeKey(place);
}

export function uniqueServicePlaces(places: readonly ServicePlace[]): ServicePlace[] {
  const nationwide = places.find((place) => place.kind === "region" && place.regionCode === "RU");
  if (nationwide) return [nationwide];
  const regions = new Set(
    places.filter((place) => place.kind === "region").map((place) => place.regionCode),
  );
  const identities = new Set<string>();
  const locations = new Set<string>();
  return places.filter(place => {
    if (place.kind === "city" && regions.has(place.regionCode)) return false;
    const identity = placeKey(place);
    const location = placeSelectionKey(place);
    if (identities.has(identity) || locations.has(location)) return false;
    identities.add(identity);
    locations.add(location);
    return true;
  });
}

export function toPlaceInput(place: ServicePlace): ServicePlaceInput {
  if (place.kind === "city") return { kind: "city", cityId: place.cityId };
  return { kind: "region", regionCode: place.regionCode };
}

type CityFilter = { id: string; regionCode: string };

function placeMatch(places: readonly ServicePlace[] | null | undefined, city: CityFilter) {
  const list = places ?? [];
  if (list.some((place) => place.kind === "city" && place.cityId === city.id)) return "explicit" as const;
  if (list.some((place) => place.kind === "region" && (place.regionCode === city.regionCode || place.regionCode === "RU"))) return "region" as const;
  return null;
}

/** Явный город выше области. Услуга попадает в одну группу. */
export function splitServicesByCity<T extends { places?: readonly ServicePlace[] | null }>(
  items: readonly T[],
  city: CityFilter | null,
): { mine: T[]; other: T[] } {
  if (!city) return { mine: [...items], other: [] };

  const explicit: T[] = [];
  const viaRegion: T[] = [];
  const other: T[] = [];
  for (const item of items) {
    const match = placeMatch(item.places, city);
    if (match === "explicit") explicit.push(item);
    else if (match === "region") viaRegion.push(item);
    else other.push(item);
  }
  return { mine: [...explicit, ...viaRegion], other };
}

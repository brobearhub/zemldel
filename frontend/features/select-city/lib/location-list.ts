import { formatRegionLabel } from "@/shared/lib/format-city-label";

export type NamedCity = {
  name: string;
};

export type LetterGroup<T> = {
  letter: string;
  cities: T[];
};

export function foldCityName(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

export function cityLetter(name: string) {
  const first = foldCityName(name).charAt(0);
  return first ? first.toLocaleUpperCase("ru-RU") : "";
}

export function capitalLetters(cities: readonly NamedCity[]) {
  const letters = new Set<string>();
  for (const city of cities) {
    const letter = cityLetter(city.name);
    if (letter) letters.add(letter);
  }
  return [...letters].sort((a, b) => a.localeCompare(b, "ru"));
}

export function filterByLetter<T extends NamedCity>(cities: readonly T[], letter: string | null) {
  if (!letter) return [...cities];
  const key = letter.toLocaleUpperCase("ru-RU");
  return cities.filter((city) => cityLetter(city.name) === key);
}

export function filterByPrefix<T extends NamedCity>(cities: readonly T[], query: string) {
  const q = foldCityName(query);
  if (!q) return [...cities];
  return cities.filter((city) => foldCityName(city.name).startsWith(q));
}

export function groupCitiesByLetter<T extends NamedCity>(cities: readonly T[]): LetterGroup<T>[] {
  const sorted = [...cities].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const groups: LetterGroup<T>[] = [];
  for (const city of sorted) {
    const letter = cityLetter(city.name);
    const last = groups.at(-1);
    if (!last || last.letter !== letter) {
      groups.push({ letter, cities: [city] });
      continue;
    }
    last.cities.push(city);
  }
  return groups;
}

export function selectFeaturedCities<T extends { featured: boolean }>(cities: readonly T[]) {
  return cities.filter((city) => city.featured);
}

export function includeSelectedCity<T extends { id: string }>(cities: readonly T[], selected: T | null): T[] {
  if (!selected || cities.some((city) => city.id === selected.id)) return [...cities];
  return [selected, ...cities];
}

export function formatRegionShort(regionName: string, cityName: string) {
  const full = formatRegionLabel(regionName);
  if (!full) return "";

  const short = full
    .replace(/^Республика\s+/i, "")
    .replace(/\s+автономный округ(?=\s|$)/gi, " АО")
    .replace(/\s+автономная область(?=\s|$)/gi, " авт. обл.")
    .replace(/\s+область(?=\s|$)/gi, " обл.");

  const cityKey = foldCityName(cityName);
  if (cityKey && (foldCityName(short) === cityKey || foldCityName(full) === cityKey)) return "";
  return short;
}

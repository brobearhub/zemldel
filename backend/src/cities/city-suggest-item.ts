import type { City } from '@prisma/client';
import {
  buildDisplayName,
  normalizeCityNameForKey,
  publicCityName,
} from './city-suggest.lib';
import type { CitySuggestItemDto } from './dto/city.dto';
import { RUSSIAN_CAPITALS } from './russian-capitals';

export const citySuggestSelect = {
  id: true,
  name: true,
  regionCode: true,
  regionName: true,
  typeName: true,
} as const;

export type SuggestCityRow = Pick<City, keyof typeof citySuggestSelect>;

// Некоторые региональные центры представлены в ГАР только записью городского округа.
const districtNames = new Map<string, string>();
for (const { regionCode, name, aliases } of RUSSIAN_CAPITALS) {
  for (const alias of aliases ?? []) {
    districtNames.set(regionCode + '/' + normalizeCityNameForKey(alias), name);
  }
}

export function toSuggestItem(row: SuggestCityRow): CitySuggestItemDto {
  const district =
    row.typeName.trim().toLowerCase().replaceAll('.', '') === 'го';
  const mapSearchName = district
    ? districtNames.get(
        row.regionCode + '/' + normalizeCityNameForKey(row.name),
      )
    : undefined;
  return {
    id: row.id,
    name: publicCityName(row.name),
    regionCode: row.regionCode,
    regionName: row.regionName,
    displayName: buildDisplayName(row),
    ...(mapSearchName && { mapSearchName }),
  };
}

import { normalizeCityNameForKey } from '../../../cities/city-suggest.lib';
import type {
  AddressReference,
  AddressSuggestions,
  CadastralLookup,
  CityCenterLookup,
  DirectoryCity,
} from '../../geocoding.ports';
import {
  addressSuggestion,
  dadataSource,
  geocodedPoint,
} from './address-mapping';
import { cadastralResult } from './cadastral-result';
import { DaDataAddressClient } from './dadata-address.client';

export class DaDataAdapter
  implements AddressSuggestions, CityCenterLookup, CadastralLookup
{
  readonly source = dadataSource;

  constructor(private readonly client = new DaDataAddressClient()) {}

  async suggest(query: string) {
    const matches = await this.client.suggestAddresses(query, { count: 8 });
    return matches.map(addressSuggestion);
  }

  async resolve(reference: AddressReference) {
    const [match] = await this.client.suggestAddresses(reference.text, {
      count: 1,
    });
    if (!match) return null;
    const sameAddress =
      reference.fiasId && match.data.fias_id
        ? match.data.fias_id === reference.fiasId
        : match.unrestricted_value.trim().toLowerCase() ===
          reference.text.toLowerCase();
    return sameAddress ? geocodedPoint(match) : null;
  }

  async findCadastralLocation(number: string) {
    return cadastralResult(number, await this.client.findAddressById(number));
  }

  async findCityCenter(city: DirectoryCity) {
    const { mapSearchName } = city;
    if (mapSearchName) {
      // В ГАР выбран городской округ. Нужен центр города в том же регионе.
      const suggestions = await this.client.suggestAddresses(
        `${city.regionName}, г ${mapSearchName}`,
        { count: 10 },
      );
      const name = normalizeCityNameForKey(mapSearchName);
      const matches = suggestions.filter(
        ({ data }) =>
          data.fias_level === '4' &&
          data.region_kladr_id?.slice(0, 2) === city.regionCode &&
          normalizeCityNameForKey(data.city ?? '') === name,
      );
      if (matches.length === 1) {
        const point = geocodedPoint(matches[0]);
        if (point) return point;
      }
    }

    const [match] = await this.client.suggestAddresses(city.fiasId, {
      count: 1,
    });
    return match?.data.fias_id?.toLowerCase() === city.fiasId.toLowerCase()
      ? geocodedPoint(match)
      : null;
  }
}

import type {
  AddressSuggestion,
  GeocodedPoint,
  GeocodingSource,
  PointPrecision,
} from '../../geocoding.ports';
import type { DaDataAddressSuggestion } from './dadata-address.client';

export const dadataSource: GeocodingSource = {
  id: 'dadata',
  name: 'DaData',
  url: 'https://dadata.ru/suggestions/',
  logoPath: '/images/dadata.svg',
};

const precisionByCode = new Map<string, PointPrecision>([
  ['0', 'exact'],
  ['1', 'nearby_house'],
  ['2', 'street'],
  ['3', 'settlement'],
  ['4', 'city'],
]);

function parseCoordinate(value: string | null | undefined, limit: number) {
  if (typeof value !== 'string' || !/^[+-]?\d+(?:\.\d+)?$/.test(value.trim()))
    return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export function geocodedPoint({
  data,
}: DaDataAddressSuggestion): GeocodedPoint | null {
  const latitude = parseCoordinate(data.geo_lat, 85);
  const longitude = parseCoordinate(data.geo_lon, 180);
  if (latitude === null || longitude === null || data.qc_geo === '5')
    return null;
  return {
    latitude,
    longitude,
    precision: precisionByCode.get(data.qc_geo ?? '') ?? 'unknown',
    source: dadataSource,
  };
}

export function addressSuggestion(
  item: DaDataAddressSuggestion,
): AddressSuggestion {
  return {
    label: item.value,
    reference: {
      source: dadataSource.id,
      text: item.unrestricted_value,
      ...(item.data.fias_id && { fiasId: item.data.fias_id }),
    },
    point: geocodedPoint(item),
  };
}

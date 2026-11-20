import type { CadastralResult } from '../../geocoding.ports';
import type { DaDataAddressSuggestion } from './dadata-address.client';
import { geocodedPoint } from './address-mapping';

function cadastralObject(data: DaDataAddressSuggestion['data']) {
  switch (data.fias_level) {
    case '75':
      return { kind: 'parcel' as const, number: data.stead_cadnum };
    case '8':
      return { kind: 'building' as const, number: data.house_cadnum };
    case '9':
      return {
        kind: 'unit' as const,
        number: data.room_cadnum ?? data.flat_cadnum,
      };
    default:
      return null;
  }
}

function buildingAddress(
  address: string,
  data: DaDataAddressSuggestion['data'],
) {
  const parts = address.split(/,\s*/);
  const unitTypes = new Set([
    'кв',
    'квартира',
    'ком',
    'комната',
    'помещ',
    'помещение',
    'офис',
    data.flat_type,
    data.flat_type_full,
    data.room_type,
    data.room_type_full,
  ]);
  const unitIndex = parts.findIndex((part) =>
    unitTypes.has(
      part
        .trim()
        .toLowerCase()
        .split(/[\s.]+/, 1)[0],
    ),
  );
  return unitIndex < 0 ? address : parts.slice(0, unitIndex).join(', ');
}

export function cadastralResult(
  number: string,
  suggestions: DaDataAddressSuggestion[],
): CadastralResult {
  // findById ищет точное совпадение. На базовом тарифе поля *_cadnum могут быть пустыми.
  const matches = suggestions.flatMap((item) => {
    const object = cadastralObject(item.data);
    if (!object || (object.number && object.number !== number)) return [];
    return [{ item, ...object }];
  });
  const exact = matches.filter((match) => match.number === number);
  const unique = new Map(
    (exact.length ? exact : matches).map((match) => [
      match.item.data.fias_id || match.item.unrestricted_value,
      match,
    ]),
  );
  if (!unique.size) return { status: 'not_found' as const };
  if (unique.size > 1) return { status: 'ambiguous' as const };

  const [{ item, kind }] = unique.values();
  const address = item.value.trim() || item.unrestricted_value.trim();
  return {
    status: 'found' as const,
    kind,
    address,
    buildingAddress:
      kind === 'unit' ? buildingAddress(address, item.data) : null,
    point: geocodedPoint(item),
    localityFiasIds: [
      item.data.settlement_fias_id,
      item.data.city_fias_id,
      item.data.region_type === 'г' ? item.data.region_fias_id : null,
    ].filter((id): id is string => Boolean(id)),
  };
}

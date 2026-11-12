import { describe, expect, it } from 'vitest';
import {
  normalizeServicePlaces,
  orderByExplicitCity,
  uniqueServiceCityIds,
  SERVICE_PLACES_REQUIRED,
} from './service-places';

describe('uniqueServiceCityIds', () => {
  it('unifies matching name and region and preserves homonyms in other regions', () => {
    const city = {
      id: 'actual',
      name: 'Екатеринбург',
      regionCode: '66',
      typeName: 'г',
      level: 5,
    };
    const alias = {
      ...city,
      id: 'municipality',
      name: '  ЕКАТЕРИНБУРГ ',
      typeName: 'г.о.',
      level: 3,
    };
    const otherRegion = { ...city, id: 'other-region', regionCode: '74' };
    const otherCity = { ...city, id: 'other-city', name: 'Нижний Тагил' };
    expect(
      uniqueServiceCityIds(
        ['municipality', 'actual', 'other-region', 'other-city', 'actual'],
        [alias, city, otherRegion, otherCity],
      ),
    ).toEqual(['actual', 'other-region', 'other-city']);
  });
});

describe('normalizeServicePlaces', () => {
  it('отклоняет пустой список', () => {
    expect(normalizeServicePlaces([])).toEqual({
      error: SERVICE_PLACES_REQUIRED,
    });
    expect(normalizeServicePlaces(undefined)).toEqual({
      error: SERVICE_PLACES_REQUIRED,
    });
  });

  it('принимает только города и только область', () => {
    expect(
      normalizeServicePlaces([
        { kind: 'city', cityId: 'a' },
        { kind: 'city', cityId: 'a' },
      ]),
    ).toEqual({ places: [{ kind: 'city', cityId: 'a' }] });

    expect(
      normalizeServicePlaces([{ kind: 'region', regionCode: '66' }]),
    ).toEqual({ places: [{ kind: 'region', regionCode: '66' }] });
  });
});

describe('orderByExplicitCity', () => {
  it('ставит явный город выше области и не дублирует услугу', () => {
    const rows = [
      { id: 'region-only', cityIds: [] as string[] },
      { id: 'explicit', cityIds: ['kazan'] },
      { id: 'both', cityIds: ['kazan'] },
    ];

    expect(orderByExplicitCity(rows, 'kazan').map((row) => row.id)).toEqual([
      'explicit',
      'both',
      'region-only',
    ]);
    expect(
      new Set(orderByExplicitCity(rows, 'kazan').map((row) => row.id)).size,
    ).toBe(3);
  });
});

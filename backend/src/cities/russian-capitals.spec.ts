import { describe, expect, it } from 'vitest';
import {
  FEATURED_REGIONAL_CAPITALS,
  RUSSIAN_CAPITALS,
  capitalIdsToInsert,
  featuredRegionalCapitalIds,
  pickRegionalCapitalCities,
  type CapitalCityCandidate,
} from './russian-capitals';

function city(
  overrides: Partial<CapitalCityCandidate> &
    Pick<CapitalCityCandidate, 'id' | 'name' | 'regionCode'>,
): CapitalCityCandidate {
  return {
    typeName: 'г',
    level: 5,
    regionName: 'регион',
    ...overrides,
  };
}

describe('RUSSIAN_CAPITALS', () => {
  it('keeps unique name and region pairs', () => {
    const keys = RUSSIAN_CAPITALS.map(
      (item) => `${item.regionCode}|${item.name.toLowerCase()}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(RUSSIAN_CAPITALS.map((item) => item.regionCode)).size).toBe(
      RUSSIAN_CAPITALS.length,
    );
  });

  it('includes Moscow, Gatchina and Kazan', () => {
    expect(RUSSIAN_CAPITALS).toEqual(
      expect.arrayContaining([
        { name: 'Москва', regionCode: '77' },
        { name: 'Гатчина', regionCode: '47' },
        { name: 'Казань', regionCode: '16' },
      ]),
    );
    expect(RUSSIAN_CAPITALS.some((item) => item.regionCode === '50')).toBe(
      false,
    );
  });
});

describe('pickRegionalCapitalCities', () => {
  it('prefers a level-5 city over a same-name locality', () => {
    const picked = pickRegionalCapitalCities([
      city({ id: 'locality', name: 'Казань', regionCode: '16', level: 6 }),
      city({ id: 'city', name: 'Казань', regionCode: '16', level: 5 }),
    ]);
    expect(picked.map((row) => row.id)).toContain('city');
    expect(picked.map((row) => row.id)).not.toContain('locality');
  });

  it('prefers the federal city record for Moscow', () => {
    const picked = pickRegionalCapitalCities([
      city({ id: 'district', name: 'Москва', regionCode: '77', level: 5 }),
      city({ id: 'federal', name: 'Москва', regionCode: '77', level: 1 }),
    ]);
    const moscow = picked.find((row) => row.regionCode === '77');
    expect(moscow?.id).toBe('federal');
  });

  it('matches Oryol when GAR stores the name without yo', () => {
    const picked = pickRegionalCapitalCities([
      city({ id: 'orel', name: 'Орел', regionCode: '57' }),
    ]);
    expect(picked.some((row) => row.id === 'orel')).toBe(true);
  });

  it('prefers a city record over an urban okrug of the same name', () => {
    const picked = pickRegionalCapitalCities([
      city({
        id: 'okrug',
        name: 'Казань',
        regionCode: '16',
        typeName: 'г.о.',
        level: 3,
      }),
      city({
        id: 'city',
        name: 'Казань',
        regionCode: '16',
        typeName: 'г',
        level: 5,
      }),
    ]);
    expect(picked.find((row) => row.regionCode === '16')?.id).toBe('city');
  });

  it('matches a GAR urban-okrug alias', () => {
    const picked = pickRegionalCapitalCities([
      city({
        id: 'vladivostok',
        name: 'Владивостокский',
        regionCode: '25',
        typeName: 'г.о.',
        level: 3,
      }),
    ]);
    expect(picked.find((row) => row.regionCode === '25')?.id).toBe(
      'vladivostok',
    );
  });

  it('picks an urban okrug when GAR has no separate city record', () => {
    const picked = pickRegionalCapitalCities([
      city({
        id: 'village',
        name: 'Орёл',
        regionCode: '57',
        typeName: 'д',
        level: 6,
      }),
      city({
        id: 'okrug',
        name: 'Орёл',
        regionCode: '57',
        typeName: 'г.о.',
        level: 3,
      }),
    ]);
    expect(picked.find((row) => row.regionCode === '57')?.id).toBe('okrug');
  });
});

describe('featuredRegionalCapitalIds', () => {
  it('keeps the popular cities in the declared order and matches the GAR alias', () => {
    const rows = FEATURED_REGIONAL_CAPITALS.map((name, index) =>
      city({
        id: `city-${index}`,
        name: name === 'Волгоград' ? 'город-герой Волгоград' : name,
        regionCode:
          RUSSIAN_CAPITALS.find((item) => item.name === name)?.regionCode ??
          '00',
        typeName: name === 'Волгоград' ? 'г.о.' : 'г',
        level: name === 'Волгоград' ? 3 : 5,
      }),
    );

    expect(featuredRegionalCapitalIds(rows)).toEqual(
      FEATURED_REGIONAL_CAPITALS.map((_, sortOrder) => ({
        cityId: `city-${sortOrder}`,
        sortOrder,
      })),
    );
    expect(new Set(FEATURED_REGIONAL_CAPITALS).size).toBe(
      FEATURED_REGIONAL_CAPITALS.length,
    );
  });
});

describe('capitalIdsToInsert', () => {
  it('adds only ids that are not already stored', () => {
    expect(capitalIdsToInsert(['a', 'b', 'c'], ['b', 'extra'])).toEqual([
      'a',
      'c',
    ]);
  });
});

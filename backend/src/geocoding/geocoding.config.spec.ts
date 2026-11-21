import { Test } from '@nestjs/testing';
import { afterEach, expect, it, vi } from 'vitest';
import {
  selectGeocodingPorts,
  type GeocodingAdapterFactory,
} from './geocoding.config';
import { GeocodingModule } from './geocoding.module';
import { GeocodingPorts } from './geocoding.ports';

function ports(id: string): GeocodingPorts {
  return {
    suggestions: {
      source: { id, name: id, url: 'https://example.test' },
      suggest: vi.fn(),
      resolve: vi.fn(),
    },
    cityCenter: { findCityCenter: vi.fn() },
    cadastral: { findCadastralLocation: vi.fn() },
  };
}

it('shares one adapter for the default and only creates selected providers', () => {
  const primary = ports('dadata');
  const create = vi.fn(() => primary);
  const unused = vi.fn(() => ports('other'));
  const factories = new Map([
    ['dadata', create],
    ['other', unused],
  ]);
  expect(selectGeocodingPorts({}, factories)).toEqual(primary);
  expect(create).toHaveBeenCalledTimes(1);
  expect(unused).not.toHaveBeenCalled();
});

it('selects each capability independently, including adapters with only one capability', () => {
  const primary = ports('primary');
  const other = ports('other');
  const factories = new Map<string, GeocodingAdapterFactory>([
    ['primary', () => primary],
    ['addresses', () => ({ suggestions: other.suggestions })],
    ['cities', () => ({ cityCenter: other.cityCenter })],
    ['register', () => ({ cadastral: other.cadastral })],
  ]);
  expect(
    selectGeocodingPorts(
      {
        GEOCODING_PROVIDER: 'primary',
        GEOCODING_SUGGESTIONS_PROVIDER: 'addresses',
        GEOCODING_CADASTRAL_PROVIDER: 'register',
      },
      factories,
    ),
  ).toEqual({ ...other, cityCenter: primary.cityCenter });
  expect(
    selectGeocodingPorts(
      {
        GEOCODING_PROVIDER: 'primary',
        GEOCODING_CITY_CENTER_PROVIDER: 'cities',
      },
      factories,
    ),
  ).toEqual({ ...primary, cityCenter: other.cityCenter });
  expect(() =>
    selectGeocodingPorts(
      {
        GEOCODING_PROVIDER: 'primary',
        GEOCODING_CADASTRAL_PROVIDER: 'cities',
      },
      factories,
    ),
  ).toThrow(/GEOCODING_CADASTRAL_PROVIDER.*cities.*cadastral/);
});

afterEach(() => vi.unstubAllEnvs());

it('loads the standalone geocoding module with the default provider before any request', async () => {
  vi.stubEnv('DADATA_API_KEY', undefined);
  const module = await Test.createTestingModule({
    imports: [GeocodingModule],
  }).compile();
  try {
    const selected = module.get(GeocodingPorts);
    expect(selected.suggestions.source.id).toBe('dadata');
    expect(selected.cityCenter).toBe(selected.suggestions);
    expect(selected.cadastral).toBe(selected.suggestions);
  } finally {
    await module.close();
  }
});

it.each([
  'GEOCODING_PROVIDER',
  'GEOCODING_SUGGESTIONS_PROVIDER',
  'GEOCODING_CITY_CENTER_PROVIDER',
  'GEOCODING_CADASTRAL_PROVIDER',
])('rejects unknown %s during Nest startup', async (setting) => {
  vi.stubEnv(setting, 'unregistered');
  await expect(
    Test.createTestingModule({ imports: [GeocodingModule] }).compile(),
  ).rejects.toThrow(new RegExp(setting + '.*unregistered'));
});

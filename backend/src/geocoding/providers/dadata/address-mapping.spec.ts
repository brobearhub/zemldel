import { describe, expect, it } from 'vitest';
import type { DaDataAddressSuggestion } from './dadata-address.client';
import {
  addressSuggestion,
  dadataSource,
  geocodedPoint,
} from './address-mapping';

const street: DaDataAddressSuggestion = {
  value: 'г Екатеринбург, Тбилисский б-р',
  unrestricted_value:
    '620073, Свердловская обл, г Екатеринбург, Чкаловский р-н, Тбилисский б-р',
  data: {
    fias_id: 'street-id',
    geo_lat: '56.7928361',
    geo_lon: '60.6285346',
    qc_geo: '2',
  },
};

describe('DaData address mapping', () => {
  it('returns numeric coordinates in their original axes and keeps the selected full address', () => {
    expect(addressSuggestion(street)).toEqual({
      label: street.value,
      reference: {
        source: dadataSource.id,
        text: street.unrestricted_value,
        fiasId: 'street-id',
      },
      point: {
        latitude: 56.7928361,
        longitude: 60.6285346,
        precision: 'street',
        source: dadataSource,
      },
    });
  });
  it.each([
    { geo_lat: null },
    { geo_lon: ' ' },
    { geo_lat: '85.5' },
    { geo_lon: '181' },
    { geo_lat: 'NaN' },
    { qc_geo: '5' },
  ])('rejects unusable provider coordinates %o', (patch) => {
    expect(
      geocodedPoint({ ...street, data: { ...street.data, ...patch } }),
    ).toBeNull();
  });
  it('keeps zero and negative coordinates, including when accuracy is unknown', () => {
    expect(
      geocodedPoint({
        ...street,
        data: { geo_lat: '0', geo_lon: '-170.25' },
      }),
    ).toEqual({
      latitude: 0,
      longitude: -170.25,
      precision: 'unknown',
      source: dadataSource,
    });
  });
});

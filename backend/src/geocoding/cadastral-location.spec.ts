import { expect, it, vi } from 'vitest';
import {
  DaDataAddressClient,
  type DaDataAddressSuggestion,
} from './providers/dadata/dadata-address.client';
import type { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from './geocoding.service';
import { DaDataAdapter } from './providers/dadata/dadata.adapter';

const number = '66:41:020401:123';
const cityGuid = '00000000-0000-4000-8000-000000000001';
const settlementGuid = '00000000-0000-4000-8000-000000000002';
const parcel: DaDataAddressSuggestion = {
  value: 'Свердловская обл, с Патруши, уч 11',
  unrestricted_value: '624016, Свердловская обл, с Патруши, уч 11',
  data: {
    fias_id: 'stead-guid',
    fias_level: '75',
    stead_cadnum: null,
    city_fias_id: cityGuid,
    settlement_fias_id: settlementGuid,
    geo_lat: '56.68',
    geo_lon: '60.82',
    qc_geo: '3',
  },
};

function setup(suggestions: DaDataAddressSuggestion[]) {
  const addresses = new DaDataAddressClient();
  const lookup = vi
    .spyOn(addresses, 'findAddressById')
    .mockResolvedValue(suggestions);
  const findMany = vi.fn().mockResolvedValue([]);
  const adapter = new DaDataAdapter(addresses);
  const service = new GeocodingService(
    { suggestions: adapter, cityCenter: adapter, cadastral: adapter },
    { city: { findMany } } as unknown as PrismaService,
  );
  return { lookup, findMany, service };
}

it('uses an exact ID lookup and links the most specific active directory location', async () => {
  const { lookup, findMany, service } = setup([parcel]);
  const city = {
    id: 'parent',
    objectGuid: cityGuid,
    name: 'Сысерть',
    regionCode: '66',
    regionName: 'Свердловская область',
    level: 5,
    typeName: 'г',
  };
  findMany.mockResolvedValue([
    city,
    {
      ...city,
      id: 'village',
      name: 'Патруши',
      typeName: 'с',
      level: 6,
      objectGuid: settlementGuid,
    },
  ]);
  expect(await service.findCadastralLocation(number)).toMatchObject({
    status: 'found',
    kind: 'parcel',
    address: parcel.value,
    point: { latitude: 56.68, longitude: 60.82, precision: 'settlement' },
    city: { id: 'village', name: 'Патруши' },
  });
  expect(lookup).toHaveBeenCalledWith(number);
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        status: 'ACTIVE',
        objectGuid: { in: [settlementGuid, cityGuid] },
      },
    }),
  );
});

it('retains the address when the provider has no usable coordinates or local city', async () => {
  const { service } = setup([
    { ...parcel, data: { ...parcel.data, geo_lat: null } },
  ]);
  expect(await service.findCadastralLocation(number)).toMatchObject({
    status: 'found',
    address: parcel.value,
    point: null,
    city: null,
  });
});

it('recognizes a flat with a free API response and returns the house as a landmark', async () => {
  const { service } = setup([
    {
      value: 'г Москва, ул Сухонская, д 11, кв 89',
      unrestricted_value: '127642, г Москва, ул Сухонская, д 11, кв 89',
      data: {
        fias_level: '9',
        flat_type: 'кв',
        flat_cadnum: null,
        geo_lat: '55.878315',
        geo_lon: '37.65372',
        qc_geo: '0',
      },
    },
  ]);
  expect(
    await service.findCadastralLocation('77:02:0004008:4143'),
  ).toMatchObject({
    status: 'found',
    kind: 'unit',
    address: 'г Москва, ул Сухонская, д 11, кв 89',
    buildingAddress: 'г Москва, ул Сухонская, д 11',
    point: { latitude: 55.878315, longitude: 37.65372 },
  });
});

it('does not guess an address from an incomplete number, an unmatched record, or ambiguous results', async () => {
  const { lookup, findMany, service } = setup([]);
  await expect(service.findCadastralLocation('77:02:0004008:')).rejects.toThrow(
    'полный кадастровый номер',
  );
  expect(lookup).not.toHaveBeenCalled();
  expect(await service.findCadastralLocation(number)).toEqual({
    status: 'not_found',
  });
  lookup.mockResolvedValueOnce([
    { ...parcel, data: { ...parcel.data, stead_cadnum: '77:12:0000000:10' } },
  ]);
  expect(await service.findCadastralLocation(number)).toEqual({
    status: 'not_found',
  });
  lookup.mockResolvedValueOnce([
    parcel,
    { ...parcel, data: { ...parcel.data, fias_id: 'different' } },
  ]);
  expect(await service.findCadastralLocation(number)).toEqual({
    status: 'ambiguous',
  });
  expect(findMany).not.toHaveBeenCalled();
});

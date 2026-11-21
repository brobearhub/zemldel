import { expect, it, vi } from 'vitest';
import { DaDataAddressClient } from './providers/dadata/dadata-address.client';
import type { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from './geocoding.service';
import { DaDataAdapter } from './providers/dadata/dadata.adapter';

const city = {
  id: 'directory-id',
  objectGuid: 'locality-guid',
  name: 'Екатеринбург',
  typeName: 'г',
  regionName: 'Свердловская область',
  regionCode: '66',
};
const data = { fias_id: city.objectGuid, geo_lat: '56.84', geo_lon: '60.6' };

function setup(row: typeof city | null = city) {
  const findUnique = vi.fn().mockResolvedValue(row);
  const suggestAddresses = vi.fn<DaDataAddressClient['suggestAddresses']>();
  const adapter = new DaDataAdapter(
    Object.assign(new DaDataAddressClient(), { suggestAddresses }),
  );
  const service = new GeocodingService(
    { suggestions: adapter, cityCenter: adapter, cadastral: adapter },
    { city: { findUnique } } as unknown as PrismaService,
  );
  return { findUnique, suggestAddresses, service };
}

it('looks up the selected active directory record by its FIAS code', async () => {
  const { findUnique, suggestAddresses, service } = setup();
  suggestAddresses.mockResolvedValue([
    { value: city.name, unrestricted_value: city.name, data },
  ]);
  expect(await service.findCityCenter(city.id)).toMatchObject({
    latitude: 56.84,
    longitude: 60.6,
  });
  expect(findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: city.id, status: 'ACTIVE' } }),
  );
  expect(suggestAddresses).toHaveBeenCalledWith(city.objectGuid, { count: 1 });
});

it('leaves the center empty when DaData substitutes a different place', async () => {
  const { suggestAddresses, service } = setup();
  suggestAddresses.mockResolvedValue([
    {
      value: city.name,
      unrestricted_value: city.name,
      data: { ...data, fias_id: 'other-guid' },
    },
  ]);
  expect(await service.findCityCenter(city.id)).toBeNull();
});

it('resolves a capital district alias only to a city in its region', async () => {
  const district = {
    ...city,
    typeName: 'г.о.',
    name: 'Владивостокский',
    regionName: 'Приморский край',
    regionCode: '25',
  };
  const { suggestAddresses, service } = setup(district);
  const locality = {
    value: 'Владивосток',
    unrestricted_value: 'Приморский край, г Владивосток',
    data: {
      fias_level: '4',
      city: 'Владивосток',
      region_kladr_id: '2500000000000',
      geo_lat: '43.12',
      geo_lon: '131.88',
    },
  };
  suggestAddresses.mockResolvedValue([
    {
      ...locality,
      data: { ...locality.data, region_kladr_id: '6600000000000' },
    },
    { ...locality, data: { ...locality.data, fias_level: '7' } },
    locality,
  ]);
  expect(await service.findCityCenter(city.id)).toMatchObject({
    latitude: 43.12,
    longitude: 131.88,
  });
  expect(suggestAddresses).toHaveBeenCalledTimes(1);
});

it('does not send a request to DaData for an unknown city', async () => {
  const { suggestAddresses, service } = setup(null);
  await expect(service.findCityCenter(city.id)).rejects.toThrow(
    'Город не найден',
  );
  expect(suggestAddresses).not.toHaveBeenCalled();
});

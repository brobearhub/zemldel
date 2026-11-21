import { expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from './geocoding.service';
import { DaDataAdapter } from './providers/dadata/dadata.adapter';
import { DaDataAddressClient } from './providers/dadata/dadata-address.client';

const street = {
  value: 'г Екатеринбург, Тбилисский б-р',
  unrestricted_value:
    '620073, Свердловская обл, г Екатеринбург, Тбилисский б-р',
  data: {
    fias_id: 'street-id',
    qc_geo: '2',
    geo_lat: '56.79',
    geo_lon: '60.63',
  },
};
function setup() {
  const client = new DaDataAddressClient();
  const lookup = vi
    .spyOn(client, 'suggestAddresses')
    .mockResolvedValue([street, street]);
  const adapter = new DaDataAdapter(client);
  const service = new GeocodingService(
    { cityCenter: adapter, suggestions: adapter, cadastral: adapter },
    {} as PrismaService,
  );
  return { service, lookup, source: adapter.source };
}

it('offers distinct choices and resolves a selection using the provider that issued it', async () => {
  const { service, lookup, source } = setup();
  const result = await service.suggestAddresses('  тбил  ');
  expect(result.source).toEqual(source);
  expect(result.items).toHaveLength(1);
  expect(lookup).toHaveBeenCalledWith('тбил', { count: 8 });
  const [suggestion] = result.items;
  await expect(service.resolveAddress(suggestion.reference)).resolves.toEqual(
    suggestion.point,
  );
  expect(lookup).toHaveBeenLastCalledWith(street.unrestricted_value, {
    count: 1,
  });
  await expect(
    service.resolveAddress({ ...suggestion.reference, fiasId: 'other' }),
  ).resolves.toBeNull();
  await expect(
    service.resolveAddress({ source: source.id, text: 'Другой адрес' }),
  ).resolves.toBeNull();
  await expect(
    service.resolveAddress({
      source: source.id,
      text: street.unrestricted_value,
    }),
  ).resolves.toEqual(suggestion.point);
});

it('keeps alternative short labels for text-only clients and one choice per full reference', async () => {
  const { service, lookup } = setup();
  const alias = 'Тбилисский бульвар';
  lookup.mockResolvedValue([street, { ...street, value: alias }, street]);
  await expect(service.suggestAddressLabels('тбил')).resolves.toEqual([
    street.value,
    alias,
  ]);
  expect((await service.suggestAddresses('тбил')).items).toHaveLength(1);
});

it('rejects stale, malformed and oversized references before contacting a provider', async () => {
  const { service, lookup, source } = setup();
  await expect(
    service.resolveAddress({ source: 'previous', text: 'Адрес' }),
  ).rejects.toMatchObject({ status: 409 });
  for (const reference of [
    null,
    {},
    { text: 'Адрес' },
    { text: 99, source: source.id },
    { text: 'x'.repeat(2001), source: source.id },
    { text: 'Адрес', source: source.id, key: {} },
    { text: 'Адрес', source: source.id, fiasId: 5 },
  ]) {
    await expect(service.resolveAddress(reference)).rejects.toMatchObject({
      status: 400,
    });
  }
  await expect(service.suggestAddresses('x'.repeat(501))).rejects.toMatchObject(
    { status: 400 },
  );
  await expect(service.suggestAddresses('  x')).resolves.toEqual({
    items: [],
    source,
  });
  await expect(
    service.resolveAddress({ text: ' ', source: source.id }),
  ).resolves.toBeNull();
  expect(lookup).not.toHaveBeenCalled();
});

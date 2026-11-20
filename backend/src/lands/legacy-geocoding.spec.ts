import type { Request } from 'express';
import { expect, it, vi } from 'vitest';
import { InternalAuthService } from '../auth/internal-auth.service';
import type { ChatService } from '../chat/chat.service';
import { GeocodingController } from '../geocoding/geocoding.controller';
import type { GeocodedPoint } from '../geocoding/geocoding.ports';
import type { GeocodingService } from '../geocoding/geocoding.service';
import type { LandMediaService } from './land-media.service';
import { LandsController } from './lands.controller';
import type { LandsService } from './lands.service';

const source = { id: 'test', name: 'Адреса', url: 'https://example.test' };
const point: GeocodedPoint = {
  latitude: 55,
  longitude: 37,
  precision: 'street',
  source,
};
const legacy = { latitude: 55, longitude: 37, qcGeo: '2' };
const reference = {
  text: 'Полный адрес',
  source: source.id,
  fiasId: 'fias-id',
};

function setup() {
  const service = {
    suggestionsSource: source,
    suggestAddressLabels: vi.fn().mockResolvedValue(['Адрес']),
    suggestAddresses: vi.fn().mockResolvedValue({
      items: [{ label: 'Адрес', reference, point }],
      source,
    }),
    resolveAddress: vi.fn().mockResolvedValue(point),
    findCityCenter: vi.fn().mockResolvedValue(point),
    findCadastralLocation: vi.fn().mockResolvedValue({
      status: 'found',
      kind: 'unit',
      address: 'Дом 1, кв 2',
      buildingAddress: 'Дом 1',
      city: null,
      point,
    }),
  };
  const auth = new InternalAuthService();
  const geocoding = service as unknown as GeocodingService;
  const lands = new LandsController(
    {} as LandsService,
    auth,
    {} as LandMediaService,
    {} as ChatService,
    geocoding,
  );
  return {
    lands,
    current: new GeocodingController(geocoding, auth),
    service,
    auth,
  };
}

it('preserves all three legacy suggestion modes, city coordinates and the cadastral landmark', async () => {
  const { lands, service, auth } = setup();
  vi.spyOn(auth, 'getUserIdFromRequest').mockReturnValue('author');
  const request = {} as Request;
  await expect(lands.addressSuggestions(request, 'адр')).resolves.toEqual([
    'Адрес',
  ]);
  await expect(
    lands.addressSuggestions(request, 'адр', 'suggest'),
  ).resolves.toEqual([
    {
      value: 'Адрес',
      unrestrictedValue: reference.text,
      fiasId: 'fias-id',
      point: legacy,
    },
  ]);
  await expect(
    lands.addressSuggestions(request, reference.text, 'resolve', 'fias-id'),
  ).resolves.toEqual({ point: legacy });
  expect(service.resolveAddress).toHaveBeenCalledWith(reference);
  await expect(lands.cityCenter(request, 'directory-id')).resolves.toEqual({
    point: { latitude: 55, longitude: 37 },
  });
  await expect(
    lands.cadastralLocation(request, '77:02:0004008:4143'),
  ).resolves.toEqual({
    status: 'found',
    kind: 'unit',
    address: 'Дом 1',
    city: null,
    point: legacy,
  });
});

it('requires authentication before invoking the shared geocoder on both sets of routes', async () => {
  const { lands, current, service } = setup();
  const guest = { header: () => undefined } as unknown as Request;
  const calls = [
    () => lands.addressSuggestions(guest, 'адрес'),
    () => lands.cityCenter(guest, 'city'),
    () => lands.cadastralLocation(guest, 'номер'),
    () => current.suggest(guest, 'адрес'),
    () => current.resolve(guest, reference),
    () => current.cityCenter(guest, 'city'),
    () => current.cadastralLocation(guest, 'номер'),
  ];
  for (const call of calls) {
    await expect(async () => call()).rejects.toMatchObject({ status: 401 });
  }
  expect(service.suggestAddresses).not.toHaveBeenCalled();
  expect(service.suggestAddressLabels).not.toHaveBeenCalled();
  expect(service.resolveAddress).not.toHaveBeenCalled();
  expect(service.findCityCenter).not.toHaveBeenCalled();
  expect(service.findCadastralLocation).not.toHaveBeenCalled();
});

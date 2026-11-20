import type { GeocodingPorts } from './geocoding.ports';

export type GeocodingAdapterFactory = () => Partial<GeocodingPorts>;
type Settings = Record<string, string | undefined>;

export function selectGeocodingPorts(
  settings: Settings,
  factories: ReadonlyMap<string, GeocodingAdapterFactory>,
): GeocodingPorts {
  const defaultId = settings.GEOCODING_PROVIDER?.trim() || 'dadata';
  if (!factories.has(defaultId)) {
    throw new Error(
      `GEOCODING_PROVIDER: неизвестный геопровайдер «${defaultId}»`,
    );
  }
  const instances = new Map<string, Partial<GeocodingPorts>>();

  function select<K extends keyof GeocodingPorts>(
    capability: K,
    setting: string,
  ): GeocodingPorts[K] {
    const id = settings[setting]?.trim() || defaultId;
    const create = factories.get(id);
    if (!create)
      throw new Error(`${setting}: неизвестный геопровайдер «${id}»`);
    const adapter = instances.get(id) ?? create();
    instances.set(id, adapter);
    const port = adapter[capability];
    if (!port)
      throw new Error(`${setting}: «${id}» не поддерживает ${capability}`);
    return port;
  }

  return {
    suggestions: select('suggestions', 'GEOCODING_SUGGESTIONS_PROVIDER'),
    cityCenter: select('cityCenter', 'GEOCODING_CITY_CENTER_PROVIDER'),
    cadastral: select('cadastral', 'GEOCODING_CADASTRAL_PROVIDER'),
  };
}

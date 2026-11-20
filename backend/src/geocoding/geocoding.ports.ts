export interface GeocodingSource {
  id: string;
  name: string;
  url: string;
  logoPath?: string;
}

export type PointPrecision =
  | 'exact'
  | 'nearby_house'
  | 'street'
  | 'settlement'
  | 'city'
  | 'unknown';

export interface GeocodedPoint {
  latitude: number;
  longitude: number;
  precision: PointPrecision;
  source: GeocodingSource;
}

/** Pass this reference back to the provider that issued the suggestion. */
export interface AddressReference {
  source: string;
  text: string;
  key?: string;
  fiasId?: string;
}

export interface AddressSuggestion {
  label: string;
  reference: AddressReference;
  point: GeocodedPoint | null;
}

export interface AddressSuggestions {
  readonly source: GeocodingSource;
  suggest(query: string): Promise<AddressSuggestion[]>;
  resolve(reference: AddressReference): Promise<GeocodedPoint | null>;
}

export interface DirectoryCity {
  name: string;
  typeName: string;
  fiasId: string;
  regionName: string;
  regionCode: string;
  mapSearchName?: string;
}

export interface CityCenterLookup {
  findCityCenter(city: DirectoryCity): Promise<GeocodedPoint | null>;
}

export type CadastralResult =
  | { status: 'not_found' | 'ambiguous' }
  | {
      status: 'found';
      kind: 'parcel' | 'building' | 'unit';
      address: string;
      buildingAddress: string | null;
      point: GeocodedPoint | null;
      /** Settlement, city, then federal city, in order of preference. */
      localityFiasIds: string[];
    };

export interface CadastralLookup {
  findCadastralLocation(number: string): Promise<CadastralResult>;
}

/** Nest injection token. Each capability can be supplied by a different adapter. */
export abstract class GeocodingPorts {
  abstract readonly suggestions: AddressSuggestions;
  abstract readonly cityCenter: CityCenterLookup;
  abstract readonly cadastral: CadastralLookup;
}

import type { CitySuggestItemDto } from "@/entities/city";

export type GeocodingSource = {
  id: string;
  name: string;
  url: string;
  logoPath?: string;
};

export type PointPrecision =
  | "exact"
  | "nearby_house"
  | "street"
  | "settlement"
  | "city"
  | "unknown";

export type GeocodedPoint = {
  latitude: number;
  longitude: number;
  precision: PointPrecision;
  source: GeocodingSource;
};

export type AddressReference = {
  source: string;
  text: string;
  key?: string;
  fiasId?: string;
};

export type AddressSuggestion = {
  label: string;
  reference: AddressReference;
  point: GeocodedPoint | null;
};

export type AddressSuggestionsResult = {
  source: GeocodingSource;
  items: AddressSuggestion[];
};

export type CadastralLocation =
  | { status: "not_found" | "ambiguous" }
  | {
      status: "found";
      kind: "parcel" | "building" | "unit";
      address: string;
      buildingAddress: string | null;
      point: GeocodedPoint | null;
      city: CitySuggestItemDto | null;
    };

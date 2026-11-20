import type {
  AddressReference,
  AddressSuggestionsResult,
  CadastralLocation,
  GeocodedPoint,
} from "./types";

export class GeocodingRequestError extends Error {
  constructor(readonly status: number) {
    super(`Ошибка геокодирования (HTTP ${status})`);
  }
}

async function request<T>(operation: string, signal?: AbortSignal, body?: object): Promise<T> {
  const response = await fetch(`/api/geocoding/${operation}`, {
    cache: "no-store",
    signal,
    ...(body && {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  if (!response.ok) throw new GeocodingRequestError(response.status);
  return response.json();
}

export function suggestAddresses(query: string, signal?: AbortSignal) {
  return request<AddressSuggestionsResult>("address-suggestions", signal, { query });
}

export async function resolveAddress(reference: AddressReference, signal?: AbortSignal) {
  const { point } = await request<{ point: GeocodedPoint | null }>("resolve-address", signal, {
    reference,
  });
  return point;
}

export async function findCityCenter(cityId: string, signal?: AbortSignal) {
  const { point } = await request<{ point: GeocodedPoint | null }>(
    `city-center?cityId=${encodeURIComponent(cityId)}`,
    signal,
  );
  return point;
}

export function findCadastralLocation(cadastralNumber: string, signal?: AbortSignal) {
  return request<CadastralLocation>("cadastral-location", signal, { cadastralNumber });
}

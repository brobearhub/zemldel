import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

const addressFields = [
  'postal_code',
  'fias_id',
  'fias_level',
  'region_type',
  'region_fias_id',
  'region_kladr_id',
  'region_with_type',
  'city',
  'city_with_type',
  'city_fias_id',
  'settlement_fias_id',
  'settlement_with_type',
  'street_with_type',
  'house',
  'stead_cadnum',
  'house_cadnum',
  'flat_cadnum',
  'room_cadnum',
  'flat_type',
  'flat_type_full',
  'room_type',
  'room_type_full',
  'geo_lat',
  'geo_lon',
  'qc_geo',
] as const;

export type DaDataAddressSuggestion = {
  value: string;
  unrestricted_value: string;
  data: Record<string, unknown> &
    Partial<Record<(typeof addressFields)[number], string | null>>;
};

type SuggestAddressesOptions = {
  count?: number;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAddressSuggestion(value: unknown): value is DaDataAddressSuggestion {
  if (!isRecord(value)) return false;
  const { unrestricted_value, data } = value;
  return (
    typeof value.value === 'string' &&
    typeof unrestricted_value === 'string' &&
    isRecord(data) &&
    addressFields.every(
      (key) => data[key] == null || typeof data[key] === 'string',
    )
  );
}

export class DaDataAddressClient {
  async suggestAddresses(
    query: string,
    { count, signal }: SuggestAddressesOptions = {},
  ): Promise<DaDataAddressSuggestion[]> {
    const text = query.trim();
    if (!text) return [];
    if (
      count !== undefined &&
      (!Number.isInteger(count) || count < 1 || count > 20)
    ) {
      throw new BadRequestException(
        'Количество подсказок должно быть от 1 до 20',
      );
    }

    const url = URL.parse(process.env.DADATA_SUGGESTIONS_URL?.trim() ?? '');
    return this.request(
      url,
      'DADATA_SUGGESTIONS_URL',
      { query: text, count },
      signal,
    );
  }

  findAddressById(query: string) {
    const configured = process.env.DADATA_FIND_ADDRESS_URL?.trim();
    const suggestionsUrl = URL.parse(
      process.env.DADATA_SUGGESTIONS_URL?.trim() ?? '',
    );
    const url = configured
      ? URL.parse(configured)
      : suggestionsUrl && URL.parse('../findById/address', suggestionsUrl);
    return this.request(url, 'DADATA_FIND_ADDRESS_URL', { query });
  }

  private async request(
    url: URL | null,
    setting: string,
    body: { query: string; count?: number },
    signal?: AbortSignal,
  ): Promise<DaDataAddressSuggestion[]> {
    const apiKey = process.env.DADATA_API_KEY?.trim();
    if (!apiKey || url?.protocol !== 'https:') {
      throw new ServiceUnavailableException(
        `Задайте DADATA_API_KEY и HTTPS-адрес ${setting}`,
      );
    }

    const timeout = AbortSignal.timeout(8000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        redirect: 'error',
      });
      if (!response.ok) {
        throw new BadGatewayException(`DaData вернула HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (
        isRecord(payload) &&
        Array.isArray(payload.suggestions) &&
        payload.suggestions.every(isAddressSuggestion)
      ) {
        return payload.suggestions;
      }
      throw new BadGatewayException('Некорректный формат подсказок DaData');
    } catch (error) {
      signal?.throwIfAborted();
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof SyntaxError) {
        throw new BadGatewayException('Некорректный JSON в ответе DaData');
      }
      throw new ServiceUnavailableException(
        'Сервис адресных подсказок DaData недоступен',
      );
    }
  }
}

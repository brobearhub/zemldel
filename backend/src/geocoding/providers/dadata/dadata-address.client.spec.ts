import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DaDataAddressClient } from './dadata-address.client';

const endpoint = 'https://dadata.example.test/custom/address';
const request = vi.fn<typeof fetch>();
const client = new DaDataAddressClient();
const address = {
  value: 'г Екатеринбург, Тбилисский б-р, д 3',
  unrestricted_value: '620073, г Екатеринбург, Тбилисский б-р, д 3',
  data: { geo_lat: null, geo_lon: null, qc_geo: null, fias_level: '8' },
};

beforeEach(() => {
  vi.stubEnv('DADATA_API_KEY', 'test-token');
  vi.stubEnv('DADATA_SUGGESTIONS_URL', endpoint);
  vi.stubEnv('DADATA_FIND_ADDRESS_URL', undefined);
  vi.stubGlobal('fetch', request.mockReset());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('DaData address suggestions', () => {
  it('looks up the exact identifier with findById on the configured suggestions host', async () => {
    vi.stubEnv(
      'DADATA_SUGGESTIONS_URL',
      'https://dadata.example.test/api/4_1/rs/suggest/address',
    );
    request.mockResolvedValue(Response.json({ suggestions: [address] }));
    await expect(client.findAddressById('77:02:0004008:4143')).resolves.toEqual(
      [address],
    );
    expect(new Request(request.mock.calls[0][0]).url).toBe(
      'https://dadata.example.test/api/4_1/rs/findById/address',
    );
    expect(request.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ query: '77:02:0004008:4143' }),
    );
  });

  it('supports a separate HTTPS lookup URL', async () => {
    vi.stubEnv(
      'DADATA_FIND_ADDRESS_URL',
      'https://dadata.example.test/exact/address',
    );
    request.mockResolvedValue(Response.json({ suggestions: [] }));
    expect(await client.findAddressById('77:02:0004008:4143')).toEqual([]);
    expect(new Request(request.mock.calls[0][0]).url).toBe(
      'https://dadata.example.test/exact/address',
    );
  });
  it('sends a JSON POST with token authentication and preserves the address data', async () => {
    request.mockResolvedValue(Response.json({ suggestions: [address] }));

    await expect(
      client.suggestAddresses(' екатеринбург тбилис '),
    ).resolves.toEqual([address]);
    const [url, options] = request.mock.calls[0];
    expect(new Request(url).url).toBe(endpoint);
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Token test-token',
      },
      body: JSON.stringify({ query: 'екатеринбург тбилис' }),
    });
  });

  it('can request details of a selected suggestion with count one', async () => {
    const selected = {
      ...address,
      data: { geo_lat: '56.7943818', geo_lon: '60.6287595', qc_geo: '0' },
    };
    request.mockResolvedValue(Response.json({ suggestions: [selected] }));
    await expect(
      client.suggestAddresses(address.unrestricted_value, { count: 1 }),
    ).resolves.toEqual([selected]);
    expect(request.mock.calls[0][1]?.body).toBe(
      JSON.stringify({ query: address.unrestricted_value, count: 1 }),
    );
  });

  it('skips empty input and rejects a bad count or missing credentials before sending', async () => {
    vi.stubEnv('DADATA_API_KEY', '');
    await expect(client.suggestAddresses('  ')).resolves.toEqual([]);
    await expect(
      client.suggestAddresses('Тула', { count: 21 }),
    ).rejects.toThrow('от 1 до 20');
    await expect(client.suggestAddresses('Тула')).rejects.toThrow(
      'DADATA_API_KEY',
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('requires the configured HTTPS endpoint before sending the token', async () => {
    vi.stubEnv('DADATA_SUGGESTIONS_URL', undefined);
    await expect(client.suggestAddresses('Тула')).rejects.toThrow(
      'DADATA_SUGGESTIONS_URL',
    );
    vi.stubEnv('DADATA_SUGGESTIONS_URL', 'http://example.test/address');
    await expect(client.suggestAddresses('Тула')).rejects.toThrow(
      'DADATA_SUGGESTIONS_URL',
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('passes caller cancellation through to the request', async () => {
    const controller = new AbortController();
    const reason = new Error('Input changed');
    request.mockImplementationOnce((_url, options) => {
      controller.abort(reason);
      expect(options?.signal?.aborted).toBe(true);
      return Promise.reject(new TypeError('fetch aborted'));
    });
    await expect(
      client.suggestAddresses('Тула', { signal: controller.signal }),
    ).rejects.toBe(reason);
  });

  it.each([403, 429])(
    'reports upstream HTTP %i without retrying',
    async (status) => {
      request.mockResolvedValue(new Response(null, { status }));
      await expect(client.suggestAddresses('Тула')).rejects.toThrow(
        `HTTP ${status}`,
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('distinguishes no matches from a malformed response', async () => {
    request.mockResolvedValueOnce(Response.json({ suggestions: [] }));
    request.mockResolvedValueOnce(
      Response.json({ suggestions: [{ value: 'Тула' }] }),
    );
    await expect(client.suggestAddresses('Тула')).resolves.toEqual([]);
    await expect(client.suggestAddresses('Тула')).rejects.toThrow(
      'Некорректный формат',
    );
  });
});

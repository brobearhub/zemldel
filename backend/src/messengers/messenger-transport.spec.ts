import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessengerConfig } from './messenger-config';
import { MessengerTransport } from './messenger-transport';

describe('messenger HTTP adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function transport() {
    const config = new MessengerConfig();
    vi.spyOn(config, 'bot').mockReturnValue({
      token: 'private-token',
      username: 'bot',
      secret: 'secret',
    });
    return new MessengerTransport(config);
  }
  it('reads Telegram message IDs and sends a plain-text link button', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: { message_id: 12 } })),
      );
    vi.stubGlobal('fetch', fetch);
    expect(
      await transport().send(
        'TELEGRAM',
        '42',
        '<b>Текст</b>',
        'https://example.com/chat',
      ),
    ).toBe('12');
    const body = JSON.parse(fetch.mock.calls[0][1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.text).toBe('<b>Текст</b>');
    expect(body).not.toHaveProperty('parse_mode');
  });
  it('reads MAX message IDs and passes credentials in the header', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: { body: { mid: 'mid-1' } } })),
      );
    vi.stubGlobal('fetch', fetch);
    expect(await transport().send('MAX', '42', 'Текст')).toBe('mid-1');
    expect(fetch.mock.calls[0][0]).toBe(
      'https://platform-api2.max.ru/messages?chat_id=42',
    );
    expect(
      (fetch.mock.calls[0][1]?.headers as Record<string, string>).Authorization,
    ).toBe('private-token');
  });
  it('preserves retry-after and never leaks tokens from network exceptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(JSON.stringify({ parameters: { retry_after: 60 } }), {
          status: 429,
        }),
      ),
    );
    await expect(
      transport().send('TELEGRAM', '42', 'Текст'),
    ).rejects.toMatchObject({ status: 429, retryAfter: 60 });
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValue(new Error('https://host/private-token')),
    );
    await expect(
      transport().send('TELEGRAM', '42', 'Текст'),
    ).rejects.toMatchObject({ status: 0, message: 'Messenger API status 0' });
  });
});

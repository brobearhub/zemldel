import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from 'grammy';
import { MessengerConfig } from './messenger-config';
import { MessengerTransport } from './messenger-transport';
import * as telegramClient from './telegram-api';

describe('messenger HTTP adapters', () => {
  beforeEach(() => {
    // Exercise the real SDK with an isolated HTTP transport; no external calls.
    vi.spyOn(telegramClient, 'createTelegramApi').mockImplementation(
      (token, timeoutSeconds) =>
        new Api(token, {
          timeoutSeconds,
          sensitiveLogs: false,
          fetch: (...args) => globalThis.fetch(...args),
        }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
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
    expect(body).toMatchObject({
      chat_id: '42',
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Открыть чат на сайте', url: 'https://example.com/chat' }],
        ],
      },
    });
    expect(telegramClient.createTelegramApi).toHaveBeenCalledWith(
      'private-token',
      10,
    );
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
  it.each(['TELEGRAM', 'MAX'] as const)(
    'adds a reply button alongside the site link for %s',
    async (platform) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify(
              platform === 'TELEGRAM'
                ? { ok: true, result: { message_id: 12 } }
                : { message: { body: { mid: '12' } } },
            ),
          ),
        );
      vi.stubGlobal('fetch', fetch);
      await transport().send(
        platform,
        '42',
        'Сообщение',
        'https://example.com/chat',
        'reply:delivery',
      );
      const body = JSON.parse(fetch.mock.calls[0][1]?.body as string) as {
        reply_markup: { inline_keyboard: unknown[][] };
        attachments: { payload: { buttons: unknown[][] } }[];
      };
      const buttons =
        platform === 'TELEGRAM'
          ? body.reply_markup.inline_keyboard
          : body.attachments[0].payload.buttons;
      expect(buttons).toHaveLength(2);
      expect(buttons[0][0]).toMatchObject({
        text: 'Ответить здесь',
        ...(platform === 'TELEGRAM'
          ? { callback_data: 'reply:delivery' }
          : { type: 'callback', payload: 'reply:delivery' }),
      });
      expect(buttons[1][0]).toMatchObject({
        text: 'Открыть чат на сайте',
        url: 'https://example.com/chat',
      });
    },
  );
  it.each(['TELEGRAM', 'MAX'] as const)(
    'acknowledges %s callbacks without removing notification buttons',
    async (platform) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ok: true, result: true, success: true }),
          ),
        );
      vi.stubGlobal('fetch', fetch);
      await transport().answerCallback(platform, 'callback/1', {
        text: 'Исходное сообщение',
        link: 'https://example.com/chat',
        replyPayload: 'reply:delivery',
      });
      const body = JSON.parse(fetch.mock.calls[0][1]?.body as string) as {
        callback_query_id: string;
        message: {
          text: string;
          attachments: { payload: { buttons: unknown[][] } }[];
        };
      };
      if (platform === 'TELEGRAM') {
        expect(fetch.mock.calls[0][0]).toContain('/answerCallbackQuery');
        expect(body.callback_query_id).toBe('callback/1');
      } else {
        expect(fetch.mock.calls[0][0]).toBe(
          'https://platform-api2.max.ru/answers?callback_id=callback%2F1',
        );
        expect(body.message.text).toBe('Исходное сообщение');
        expect(body.message.attachments[0].payload.buttons).toHaveLength(2);
      }
    },
  );
  it('preserves retry-after and never leaks tokens from network exceptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error_code: 429,
            description: 'private-token',
            parameters: { retry_after: 60 },
          }),
          {
            status: 429,
          },
        ),
      ),
    );
    await expect(
      transport().send('TELEGRAM', '42', 'Текст'),
    ).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
      message: 'Messenger API status 429',
    });
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

  it('preserves a Telegram block response for the queue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        Response.json({
          ok: false,
          error_code: 403,
          description: 'private-token',
        }),
      ),
    );
    await expect(
      transport().send('TELEGRAM', '42', 'Текст'),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Messenger API status 403',
    });
  });

  it('rejects malformed Telegram success responses instead of acknowledging delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json({ ok: true, result: {} })),
    );
    await expect(
      transport().send('TELEGRAM', '42', 'Текст'),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('bounds Telegram calls to ten seconds without hidden SDK retries', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetch);
    const result = expect(
      transport().send('TELEGRAM', '42', 'Текст'),
    ).rejects.toMatchObject({ status: 0, message: 'Messenger API status 0' });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

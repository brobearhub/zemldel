import { Logger } from '@nestjs/common';
import { GrammyError } from 'grammy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerConfig } from './messenger-config';
import type { MessengerService } from './messenger.service';
import { MessengerApiError } from './messenger-transport';
import { TelegramPoller } from './telegram-poller';

// Vitest's clock replaces global timers, but not node:timers/promises internals.
vi.mock('node:timers/promises', () => ({
  setTimeout: (
    ms: number,
    value: unknown,
    { signal }: { signal: AbortSignal },
  ) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('aborted'));
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      }, ms);
      signal.addEventListener('abort', abort, { once: true });
    }),
}));

const state = vi.hoisted(() => ({
  clients: [] as Array<{
    emit: (name: string, value?: unknown) => boolean;
    end: ReturnType<typeof vi.fn>;
  }>,
  locked: false,
  failConnect: false,
  getWebhookInfo: vi.fn(),
  getUpdates:
    vi.fn<
      (
        options: { offset: number; timeout: number; allowed_updates: string[] },
        signal: AbortSignal,
      ) => Promise<Array<{ update_id: number }>>
    >(),
}));
vi.mock('./telegram-api', () => ({
  createTelegramApi: () => ({
    getWebhookInfo: state.getWebhookInfo,
    getUpdates: state.getUpdates,
  }),
}));
vi.mock('pg', async () => {
  const { EventEmitter } = await import('node:events');
  class Client extends EventEmitter {
    ownsLock = false;
    constructor() {
      super();
      state.clients.push(this);
    }
    connect = vi.fn(() =>
      state.failConnect
        ? Promise.reject(new Error('private connection string'))
        : Promise.resolve(),
    );
    query = vi.fn((sql: string) => {
      if (!sql.includes('pg_try_advisory_lock'))
        return Promise.resolve({ rows: [] });
      this.ownsLock = !state.locked;
      state.locked = true;
      return Promise.resolve({ rows: [{ acquired: this.ownsLock }] });
    });
    end = vi.fn(() => {
      if (this.ownsLock) state.locked = false;
      this.ownsLock = false;
      this.emit('end');
      return Promise.resolve();
    });
  }
  return { Client };
});

const pollers: TelegramPoller[] = [];
const receive =
  vi.fn<(platform: string, update: { update_id: number }) => Promise<void>>();
const warn = vi.fn();
const update = (id: number) => ({ update_id: id });
function start() {
  const poller = new TelegramPoller(new MessengerConfig(), {
    receive,
  } as unknown as MessengerService);
  pollers.push(poller);
  poller.onModuleInit();
  return poller;
}
// Resolve background microtasks without waiting for real long-poll requests.
async function flush() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

describe('Telegram polling lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.clients.length = 0;
    state.locked = false;
    state.failConnect = false;
    vi.stubEnv('TELEGRAM_UPDATES_MODE', 'polling');
    vi.stubEnv('MESSENGER_WORKER_ENABLED', 'true');
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.stubEnv('MESSENGER_SITE_URL', 'https://example.com');
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '123:secret');
    vi.stubEnv('TELEGRAM_BOT_USERNAME', 'test_bot');
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', '1234567890123456');
    receive.mockReset().mockResolvedValue(undefined);
    state.getWebhookInfo.mockReset().mockResolvedValue({ url: '' });
    state.getUpdates.mockReset().mockImplementation(
      (_options, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new Error('cancelled')),
            { once: true },
          );
        }),
    );
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn.mockReset();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(warn);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await Promise.all(pollers.splice(0).map((p) => p.onModuleDestroy()));
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not start for webhook mode or a disabled worker', () => {
    vi.stubEnv('TELEGRAM_UPDATES_MODE', 'webhook');
    start();
    vi.stubEnv('TELEGRAM_UPDATES_MODE', 'polling');
    vi.stubEnv('MESSENGER_WORKER_ENABLED', 'false');
    start();
    expect(state.clients).toHaveLength(0);
  });

  it('processes updates sequentially before advancing the next request offset', async () => {
    let complete!: () => void;
    receive.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    state.getUpdates.mockResolvedValueOnce([update(11), update(12)]);
    start();
    await flush();
    expect(receive).toHaveBeenCalledTimes(1);
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
    complete();
    await flush();
    expect(receive.mock.calls).toEqual([
      ['TELEGRAM', update(11)],
      ['TELEGRAM', update(12)],
    ]);
    expect(state.getUpdates.mock.calls[1][0]).toMatchObject({
      offset: 13,
      timeout: 25,
      allowed_updates: ['message', 'my_chat_member', 'callback_query'],
    });
  });

  it('retries a failed update without acknowledging it or skipping later updates', async () => {
    state.getUpdates
      .mockResolvedValueOnce([update(11), update(12)])
      .mockResolvedValueOnce([update(12)]);
    receive
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB unavailable'));
    start();
    await flush();
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(state.getUpdates.mock.calls[1][0].offset).toBe(12);
    expect(state.getUpdates.mock.calls[2][0].offset).toBe(13);
    expect(
      receive.mock.calls.filter((call) => call[1].update_id === 12),
    ).toHaveLength(2);
  });

  it('backs off after network failures without exposing the error or token', async () => {
    state.getUpdates.mockRejectedValueOnce(
      new Error('https://api.telegram.org/bot123:secret'),
    );
    start();
    await flush();
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('123:secret');
    await vi.advanceTimersByTimeAsync(999);
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.getUpdates).toHaveBeenCalledTimes(2);
  });

  it('respects Telegram retry_after on 429', async () => {
    state.getUpdates.mockRejectedValueOnce(
      new GrammyError(
        'failure',
        {
          ok: false,
          error_code: 429,
          description: 'secret',
          parameters: { retry_after: 5 },
        },
        'getUpdates',
        {},
      ),
    );
    start();
    await flush();
    await vi.advanceTimersByTimeAsync(4999);
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.getUpdates).toHaveBeenCalledTimes(2);
  });

  it('waits for admin setup while a webhook exists, then starts automatically', async () => {
    state.getWebhookInfo.mockResolvedValueOnce({
      url: 'https://example.com/hook',
    });
    start();
    await flush();
    expect(state.getUpdates).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('messengers:setup'),
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
  });

  it('allows only the lock owner to poll; another replica takes over after shutdown', async () => {
    const first = start();
    await flush();
    start();
    await flush();
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
    await first.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(state.getUpdates).toHaveBeenCalledTimes(2);
  });

  it('aborts the request on database disconnect and reconnects', async () => {
    start();
    await flush();
    const signal = state.getUpdates.mock.calls[0][1];
    state.clients[0].emit('error', new Error('connection lost'));
    await flush();
    expect(signal.aborted).toBe(true);
    expect(state.clients[0].end).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(state.getUpdates).toHaveBeenCalledTimes(2);
  });

  it('retries database connection failures and stops retries on shutdown', async () => {
    state.failConnect = true;
    const poller = start();
    await flush();
    expect(state.getUpdates).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(state.clients).toHaveLength(2);
    await poller.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.clients).toHaveLength(2);
  });

  it('does not let a permanently rejected reply block subsequent users', async () => {
    state.getUpdates.mockResolvedValueOnce([update(11), update(12)]);
    receive.mockRejectedValueOnce(new MessengerApiError(403));
    start();
    await flush();
    expect(receive).toHaveBeenCalledTimes(2);
    expect(state.getUpdates.mock.calls[1][0].offset).toBe(13);
  });

  it('cancels a pending long poll and releases its lock on shutdown', async () => {
    const poller = start();
    await flush();
    const signal = state.getUpdates.mock.calls[0][1];
    await poller.onModuleDestroy();
    expect(signal.aborted).toBe(true);
    expect(state.locked).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.getUpdates).toHaveBeenCalledTimes(1);
  });
});

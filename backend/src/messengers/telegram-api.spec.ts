import type { ApiClientOptions } from 'grammy';
import type { Agent } from 'node:https';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTelegramApi } from './telegram-api';

const state = vi.hoisted(() => ({
  fetch: vi.fn(),
  options: [] as ApiClientOptions[],
}));
vi.mock('grammy', async (original) => {
  const grammy = await original<typeof import('grammy')>();
  return {
    ...grammy,
    Api: class extends grammy.Api {
      constructor(token: string, options: ApiClientOptions = {}) {
        state.options.push(options);
        super(token, { ...options, fetch: state.fetch });
      }
    },
  };
});

describe('Telegram API transport', () => {
  beforeEach(() => {
    state.fetch.mockReset();
    state.options.length = 0;
  });

  it('uses one IPv4 keep-alive agent for setup, replies and polling', () => {
    for (const timeout of [15, 10, 35]) createTelegramApi('123:test', timeout);
    const agents = state.options.map((o) => o.baseFetchConfig?.agent as Agent);
    expect(agents[0]).toBe(agents[1]);
    expect(agents[1]).toBe(agents[2]);
    expect(agents[0].options).toMatchObject({ family: 4, keepAlive: true });
    expect(state.options.map((o) => o.timeoutSeconds)).toEqual([15, 10, 35]);
    expect(state.options.every((o) => o.sensitiveLogs === false)).toBe(true);
  });

  it('propagates a native abort signal through the real SDK to the HTTP request', async () => {
    let requestSignal: AbortSignal | undefined;
    state.fetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          requestSignal = init.signal;
          init.signal.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );
    const controller = new AbortController();
    const api = createTelegramApi('123:test', 35);
    const pending = api.getUpdates(
      { timeout: 25 },
      controller.signal as unknown as Parameters<typeof api.getUpdates>[1],
    );
    const rejected = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(requestSignal).toBeDefined());
    controller.abort();
    await rejected;
    expect(requestSignal?.aborted).toBe(true);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });
});

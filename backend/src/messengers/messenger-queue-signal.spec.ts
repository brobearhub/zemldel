import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerConfig } from './messenger-config';
import { MessengerQueueSignal } from './messenger-queue-signal';

const state = vi.hoisted(() => ({
  clients: [] as Array<{
    emit: (name: string, value?: unknown) => boolean;
    query: ReturnType<typeof vi.fn>;
  }>,
  failConnect: false,
}));
vi.mock('pg', async () => {
  const { EventEmitter } = await import('node:events');
  class Client extends EventEmitter {
    constructor() {
      super();
      state.clients.push(this);
    }
    connect = vi.fn(() =>
      state.failConnect
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(),
    );
    query = vi.fn(() => Promise.resolve({ rows: [] }));
    end = vi.fn(() => {
      this.emit('end');
      return Promise.resolve();
    });
  }
  return { Client };
});

describe('PostgreSQL queue listener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.clients.length = 0;
    state.failConnect = false;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes once, emits recovery, then waits for notifications without queries', async () => {
    const signal = new MessengerQueueSignal(new MessengerConfig());
    const wake = vi.fn();
    signal.start(wake);
    await vi.advanceTimersByTimeAsync(0);
    expect(wake).toHaveBeenCalledTimes(1);
    expect(state.clients[0].query).toHaveBeenCalledWith(
      'LISTEN messenger_queue_ready',
    );
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(state.clients[0].query).toHaveBeenCalledTimes(1);
    expect(wake).toHaveBeenCalledTimes(1);
    state.clients[0].emit('notification', { channel: 'other' });
    expect(wake).toHaveBeenCalledTimes(1);
    state.clients[0].emit('notification', { channel: 'messenger_queue_ready' });
    expect(wake).toHaveBeenCalledTimes(2);
    await signal.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reconnects once after error/end and requests recovery after resubscribing', async () => {
    const signal = new MessengerQueueSignal(new MessengerConfig());
    const wake = vi.fn();
    signal.start(wake);
    await vi.advanceTimersByTimeAsync(0);
    state.clients[0].emit('error', new Error('disconnect'));
    state.clients[0].emit('end');
    await vi.advanceTimersByTimeAsync(999);
    expect(state.clients).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.clients).toHaveLength(2);
    expect(wake).toHaveBeenCalledTimes(2);
    state.clients[0].emit('notification', { channel: 'messenger_queue_ready' });
    expect(wake).toHaveBeenCalledTimes(2);
    await signal.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.clients).toHaveLength(2);
  });

  it('retries a failed initial connection and cancels reconnect on shutdown', async () => {
    const signal = new MessengerQueueSignal(new MessengerConfig());
    const wake = vi.fn();
    state.failConnect = true;
    signal.start(wake);
    await vi.advanceTimersByTimeAsync(0);
    expect(wake).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(state.clients).toHaveLength(2);
    await signal.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.clients).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});

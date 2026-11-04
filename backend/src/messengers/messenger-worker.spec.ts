import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessengerWorker } from './messenger-worker';

function setup(enabled = true) {
  let notify!: () => void;
  const signal = {
    start: vi.fn((callback: () => void) => {
      notify = callback;
    }),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  const repository = { nextWakeAt: vi.fn().mockResolvedValue(null) };
  const service = { tick: vi.fn().mockResolvedValue(undefined) };
  // Внешние границы: сигнал БД, репозиторий и отправка. Планировщик настоящий.
  const worker = new MessengerWorker(
    { workerEnabled: enabled } as never,
    signal as never,
    repository as never,
    service as never,
  );
  worker.onModuleInit();
  return { worker, signal, repository, service, notify: () => notify() };
}

describe('event-driven messenger worker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not start a listener or timer when disabled', async () => {
    const ctx = setup(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ctx.signal.start).not.toHaveBeenCalled();
    expect(ctx.service.tick).not.toHaveBeenCalled();
    await ctx.worker.onModuleDestroy();
  });

  it('recovers once after LISTEN, then stays idle with no polling', async () => {
    const ctx = setup();
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.service.tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(ctx.service.tick).toHaveBeenCalledTimes(1);
    expect(ctx.repository.nextWakeAt).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.service.tick).toHaveBeenCalledTimes(2);
    await ctx.worker.onModuleDestroy();
  });

  it('wakes exactly at the retry deadline, then stops when empty', async () => {
    const ctx = setup();
    ctx.repository.nextWakeAt.mockResolvedValueOnce(
      new Date(Date.now() + 60_000),
    );
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(ctx.service.tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(ctx.service.tick).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    await ctx.worker.onModuleDestroy();
  });

  it('new work wakes the worker before an old retry deadline', async () => {
    const ctx = setup();
    ctx.repository.nextWakeAt.mockResolvedValueOnce(
      new Date(Date.now() + 60_000),
    );
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    ctx.notify();
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.service.tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ctx.service.tick).toHaveBeenCalledTimes(2);
    await ctx.worker.onModuleDestroy();
  });

  it('does not lose a signal arriving during a running batch or overlap batches', async () => {
    const ctx = setup();
    let finish!: () => void;
    ctx.service.tick.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    ctx.notify();
    ctx.notify();
    expect(ctx.service.tick).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(1);
    expect(ctx.service.tick).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    await ctx.worker.onModuleDestroy();
  });

  it('retries a database failure without needing another message', async () => {
    const ctx = setup();
    ctx.service.tick.mockRejectedValueOnce(new Error('database unavailable'));
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(999);
    expect(ctx.service.tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(ctx.service.tick).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    await ctx.worker.onModuleDestroy();
  });

  it('cancels timers and ignores notifications after shutdown', async () => {
    const ctx = setup();
    ctx.repository.nextWakeAt.mockResolvedValueOnce(
      new Date(Date.now() + 60_000),
    );
    ctx.notify();
    await vi.advanceTimersByTimeAsync(0);
    await ctx.worker.onModuleDestroy();
    ctx.notify();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ctx.service.tick).toHaveBeenCalledTimes(1);
    expect(ctx.signal.stop).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

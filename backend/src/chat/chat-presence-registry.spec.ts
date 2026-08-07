import { describe, expect, it, vi } from 'vitest';
import { ChatPresenceRegistry } from './chat-presence-registry';

describe('ChatPresenceRegistry', () => {
  it('becomes online on first socket and offline on last socket after grace', async () => {
    vi.useFakeTimers();
    const reg = new ChatPresenceRegistry();
    const onFinalize = vi.fn();

    expect(reg.isOnline('u1')).toBe(false);

    expect(reg.registerConnected('u1', 's1').becameOnline).toBe(true);
    expect(reg.isOnline('u1')).toBe(true);

    reg.scheduleDisconnected('s1', 2500, onFinalize);
    expect(reg.isOnline('u1')).toBe(true);

    await vi.advanceTimersByTimeAsync(2499);
    expect(reg.isOnline('u1')).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(reg.isOnline('u1')).toBe(false);
    expect(onFinalize).toHaveBeenCalledWith('u1', true);

    vi.useRealTimers();
  });

  it('multitab: disconnecting one socket does not take user offline', async () => {
    vi.useFakeTimers();
    const reg = new ChatPresenceRegistry();
    const onFinalize = vi.fn();

    reg.registerConnected('u1', 's1');
    reg.registerConnected('u1', 's2');
    expect(reg.isOnline('u1')).toBe(true);

    reg.scheduleDisconnected('s1', 2500, onFinalize);
    await vi.advanceTimersByTimeAsync(2500);

    expect(reg.isOnline('u1')).toBe(true);
    expect(onFinalize).toHaveBeenCalledWith('u1', false);

    vi.useRealTimers();
  });

  it('grace: reconnect within grace keeps user online (no flicker)', async () => {
    vi.useFakeTimers();
    const reg = new ChatPresenceRegistry();
    const onFinalize = vi.fn();

    reg.registerConnected('u1', 'old');
    reg.scheduleDisconnected('old', 2500, onFinalize);
    await vi.advanceTimersByTimeAsync(1000);

    reg.registerConnected('u1', 'new');
    await vi.advanceTimersByTimeAsync(1500);

    expect(reg.isOnline('u1')).toBe(true);
    expect(onFinalize).toHaveBeenCalledWith('u1', false);

    vi.useRealTimers();
  });
});


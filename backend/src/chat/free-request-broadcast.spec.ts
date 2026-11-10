import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FreeRequestBroadcast,
  FREE_REQUEST_BATCH_MS,
} from './free-request-broadcast';

function setup() {
  const user = {
    id: 'user',
    activeProviderId: 'provider',
    providerMemberships: [
      {
        providerId: 'provider',
        provider: {
          city: { regionCode: '66' },
          services: [{ categoryId: 'leaf' }],
        },
      },
    ],
  };
  const prisma = {
    user: { findMany: vi.fn().mockResolvedValue([user]) },
    serviceCategory: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'leaf', parentId: 'parent' },
        { id: 'parent', parentId: null },
        { id: 'sibling', parentId: 'parent' },
      ]),
    },
  };
  const emit = vi.fn();
  const server = {
    in: vi.fn(() => ({
      fetchSockets: vi.fn().mockResolvedValue([{ data: { userId: 'user' } }]),
    })),
    to: vi.fn(() => ({ emit })),
  };
  const broadcaster = new FreeRequestBroadcast(
    prisma as never,
    () => server as never,
  );
  const send = (
    requestId: string,
    categoryId: string | null = null,
    regionCode = '66',
  ) => {
    broadcaster.enqueue({
      requestId,
      categoryId,
      regionCode,
      createdAt: '2026-11-10T12:00:00Z',
    });
  };
  return { broadcaster, prisma, emit, user, send };
}

afterEach(() => vi.useRealTimers());

describe('free request audience and burst protection', () => {
  it('collapses 10,000 requests into one signal and one audience query, with bounded cadence', async () => {
    vi.useFakeTimers();
    const { broadcaster, send, emit, prisma } = setup();
    for (let index = 0; index < 10_000; index++)
      send(String(index).padStart(5, '0'));
    expect(emit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(FREE_REQUEST_BATCH_MS);
    expect(emit).toHaveBeenCalledExactlyOnceWith('free-request.created', {
      requestId: '09999',
      createdAt: '2026-11-10T12:00:00Z',
    });
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    send('next');
    await vi.advanceTimersByTimeAsync(FREE_REQUEST_BATCH_MS - 1);
    expect(emit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(emit).toHaveBeenCalledTimes(2);
    broadcaster.destroy();
  });

  it('matches parent and exact subcategory, excludes sibling and other region, and reads current services', async () => {
    const { broadcaster, send, emit, user } = setup();
    send('sibling', 'sibling');
    send('elsewhere', null, '77');
    await broadcaster.flush();
    expect(emit).not.toHaveBeenCalled();
    send('parent', 'parent');
    await broadcaster.flush();
    expect(emit).toHaveBeenCalledTimes(1);
    send('leaf', 'leaf');
    await broadcaster.flush();
    expect(emit).toHaveBeenCalledTimes(2);
    user.providerMemberships[0].provider.services = [];
    send('removed', 'leaf');
    await broadcaster.flush();
    expect(emit).toHaveBeenCalledTimes(2);
    send('uncategorized');
    await broadcaster.flush();
    expect(emit).toHaveBeenCalledTimes(3);
    user.providerMemberships = [];
    send('revoked');
    await broadcaster.flush();
    expect(emit).toHaveBeenCalledTimes(3);
    broadcaster.destroy();
  });

  it('retries a failed audience lookup and cancels pending work on shutdown', async () => {
    vi.useFakeTimers();
    const { broadcaster, send, emit, prisma } = setup();
    prisma.user.findMany.mockRejectedValueOnce(
      new Error('temporarily unavailable'),
    );
    send('retry');
    await vi.advanceTimersByTimeAsync(FREE_REQUEST_BATCH_MS);
    expect(emit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(FREE_REQUEST_BATCH_MS);
    expect(emit).toHaveBeenCalledTimes(1);
    send('shutdown');
    broadcaster.destroy();
    await vi.advanceTimersByTimeAsync(FREE_REQUEST_BATCH_MS);
    expect(emit).toHaveBeenCalledTimes(1);
  });
});

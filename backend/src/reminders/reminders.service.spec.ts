import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RemindersService } from './reminders.service';

describe('upcoming reminder count', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    requestReminder: { count: vi.fn() },
  };
  const service = new RemindersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T23:30:00Z'));
    vi.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      activeProviderId: 'provider-1',
      providerMemberships: [{ providerId: 'provider-1' }],
    });
    prisma.requestReminder.count.mockResolvedValue(3);
  });
  afterEach(() => vi.useRealTimers());

  it('counts only unfinished events in the next hour for the active provider, across midnight', async () => {
    expect(await service.upcomingCount('user-1')).toEqual({ count: 3 });
    expect(prisma.requestReminder.count).toHaveBeenCalledWith({
      where: {
        providerId: 'provider-1',
        isDone: false,
        remindAt: {
          gte: new Date('2026-11-10T23:30:00Z'),
          lte: new Date('2026-11-11T00:30:00Z'),
        },
      },
    });
  });

  it('uses the active membership when there is no selected provider', async () => {
    prisma.user.findUnique.mockResolvedValue({
      activeProviderId: null,
      providerMemberships: [{ providerId: 'provider-2' }],
    });
    prisma.requestReminder.count.mockResolvedValue(0);
    expect(await service.upcomingCount('user-1')).toEqual({ count: 0 });
    expect(prisma.requestReminder.count.mock.calls[0]).toMatchObject([
      { where: { providerId: 'provider-2' } },
    ]);
  });

  it('does not query reminders without a provider', async () => {
    prisma.user.findUnique.mockResolvedValue({
      activeProviderId: null,
      providerMemberships: [],
    });
    await expect(service.upcomingCount('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.requestReminder.count).not.toHaveBeenCalled();
  });

  it('does not use a selected provider without management membership', async () => {
    prisma.user.findUnique.mockResolvedValue({
      activeProviderId: 'provider-1',
      providerMemberships: [{ providerId: 'provider-2' }],
    });
    await expect(service.upcomingCount('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.requestReminder.count).not.toHaveBeenCalled();
    expect(
      prisma.user.findUnique.mock.calls[0][0].select.providerMemberships.where,
    ).toEqual({ status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } });
  });
});

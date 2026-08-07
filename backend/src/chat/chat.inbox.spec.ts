import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

function makeService(prisma: any) {
  const internalAuth = {} as any;
  const gateway = {} as any;
  return new ChatService(prisma, internalAuth, gateway);
}

describe('ChatService listInbox', () => {
  it('customer: filters out threads locked to another provider and groups by requestId', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          systemRole: 'USER',
          activeProviderId: null,
          providerMemberships: [],
        }),
      },
      conversation: {
        findMany: vi.fn().mockResolvedValue([
          {
            requestId: 'r1',
            providerId: 'p1',
            lastMessageAt: new Date('2026-08-07T10:00:00.000Z'),
            createdAt: new Date('2026-08-07T09:00:00.000Z'),
            request: {
              id: 'r1',
              status: 'ACTIVE',
              lockedAt: new Date('2026-08-07T00:00:00.000Z'),
              providerId: 'p2', // locked to other provider => must be hidden from customer
              service: { title: 'Услуга 1' },
              category: null,
            },
            messages: [{ body: 'hello', createdAt: new Date('2026-08-07T10:00:00.000Z') }],
          },
          {
            requestId: 'r2',
            providerId: 'p9',
            lastMessageAt: new Date('2026-08-07T08:00:00.000Z'),
            createdAt: new Date('2026-08-07T07:00:00.000Z'),
            request: {
              id: 'r2',
              status: 'DISCUSSING',
              lockedAt: null,
              providerId: null,
              service: null,
              category: { name: 'Категория 2' },
            },
            messages: [{ body: 'msg2', createdAt: new Date('2026-08-07T08:00:00.000Z') }],
          },
          {
            requestId: 'r2',
            providerId: 'p8',
            lastMessageAt: new Date('2026-08-06T08:00:00.000Z'),
            createdAt: new Date('2026-08-06T07:00:00.000Z'),
            request: {
              id: 'r2',
              status: 'DISCUSSING',
              lockedAt: null,
              providerId: null,
              service: null,
              category: { name: 'Категория 2' },
            },
            messages: [{ body: 'older', createdAt: new Date('2026-08-06T08:00:00.000Z') }],
          },
        ]),
      },
    };

    const svc = makeService(prisma);
    const items = await svc.listInbox('u1', 'customer');

    expect(items).toEqual([
      expect.objectContaining({
        serviceRequestId: 'r2',
        title: 'Категория 2',
        lastSnippet: 'msg2',
      }),
    ]);
  });

  it('provider: uses activeProviderId when available', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          systemRole: 'USER',
          activeProviderId: 'p1',
          providerMemberships: [{ providerId: 'p1' }],
        }),
      },
      conversation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const svc = makeService(prisma);
    await svc.listInbox('u1', 'provider');

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ providerId: 'p1' }),
      }),
    );
  });

  it('provider: throws when user has no provider memberships', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'u1',
          systemRole: 'USER',
          activeProviderId: null,
          providerMemberships: [],
        }),
      },
      conversation: {
        findMany: vi.fn(),
      },
    };

    const svc = makeService(prisma);
    await expect(svc.listInbox('u1', 'provider')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});


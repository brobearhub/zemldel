import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

function setup(role: 'customer' | 'provider', rows: unknown[]) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        systemRole: 'USER',
        activeProviderId: role === 'provider' ? 'p1' : null,
        providerMemberships:
          role === 'provider' ? [{ providerId: 'p1', role: 'OWNER' }] : [],
      }),
    },
    conversation: { findMany: vi.fn().mockResolvedValue(rows) },
    $queryRaw: vi.fn().mockResolvedValue([{ conversationId: 'c1', count: 3n }]),
  };
  const service = new ChatService(prisma as never, {} as never, {} as never);
  return { prisma, service };
}

describe('unread snapshot', () => {
  it('includes request, direct and zero-count conversations beyond the inbox limit for the active provider', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: `c${index + 1}`,
      kind: 'REQUEST',
      requestId: `r${index + 1}`,
      providerId: 'p1',
      request: { providerId: 'p1', lockedAt: new Date() },
    }));
    rows.push({
      id: 'direct',
      kind: 'DIRECT',
      requestId: null as never,
      providerId: 'p1',
      request: null as never,
    });
    const { prisma, service } = setup('provider', rows);
    const result = await service.unreadSnapshot('u1', 'provider');
    expect(result).toHaveLength(502);
    expect(result[0]).toEqual({
      conversationId: 'c1',
      serviceRequestId: 'r1',
      unreadCount: 3,
    });
    expect(result[500]).toEqual({
      conversationId: 'c501',
      serviceRequestId: 'r501',
      unreadCount: 0,
    });
    expect(result[501]).toEqual({
      conversationId: 'direct',
      serviceRequestId: null,
      unreadCount: 0,
    });
    expect({
      ...prisma.conversation.findMany.mock.calls[0][0],
      where: prisma.conversation.findMany.mock.calls[0][0].where.OR[0],
    }).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                { providerId: 'p1' },
                { kind: 'PARTNER', partnerProviderId: 'p1' },
              ],
            },
          ]),
        }),
      }),
    );
    expect(prisma.conversation.findMany.mock.calls[0][0]).not.toHaveProperty(
      'take',
    );
  });

  it('keeps separate customer conversations and filters a provider excluded by a locked request', async () => {
    const { service } = setup('customer', [
      {
        id: 'c1',
        kind: 'REQUEST',
        requestId: 'r1',
        providerId: 'p1',
        request: { providerId: null, lockedAt: null },
      },
      {
        id: 'c2',
        kind: 'REQUEST',
        requestId: 'r1',
        providerId: 'p2',
        request: { providerId: null, lockedAt: null },
      },
      {
        id: 'hidden',
        kind: 'REQUEST',
        requestId: 'r2',
        providerId: 'p1',
        request: { providerId: 'p2', lockedAt: new Date() },
      },
    ]);
    await expect(service.unreadSnapshot('u1', 'customer')).resolves.toEqual([
      { conversationId: 'c1', serviceRequestId: 'r1', unreadCount: 3 },
      { conversationId: 'c2', serviceRequestId: 'r1', unreadCount: 0 },
    ]);
  });

  it('does not query unread counts for an empty inbox', async () => {
    const { service, prisma } = setup('customer', []);
    await expect(service.unreadSnapshot('u1', 'customer')).resolves.toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('restricts an employee to assigned request conversations', async () => {
    const { service, prisma } = setup('provider', []);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      systemRole: 'USER',
      activeProviderId: 'p1',
      providerMemberships: [{ providerId: 'p1', role: 'EMPLOYEE' }],
    });
    await service.unreadSnapshot('u1', 'provider');
    expect({
      ...prisma.conversation.findMany.mock.calls[0][0],
      where: prisma.conversation.findMany.mock.calls[0][0].where.OR[0],
    }).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          kind: 'REQUEST',
          request: {
            providerId: 'p1',
            assignedMember: { userId: 'u1', status: 'ACTIVE' },
            status: { not: 'CLOSED' },
          },
        }),
      }),
    );
  });

  it('chunks large snapshots and keeps the indexed conversation column uncast', async () => {
    const rows = Array.from({ length: 5001 }, (_, index) => ({
      id: `c${index + 1}`,
      kind: 'REQUEST',
      requestId: `r${index + 1}`,
      providerId: 'p1',
      request: { providerId: 'p1', lockedAt: null },
    }));
    const { service, prisma } = setup('provider', rows);
    const result = await service.unreadSnapshot('u1', 'provider');
    expect(result).toHaveLength(5001);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$queryRaw.mock.calls[0][0].sql).toContain(
      'm."conversationId" IN',
    );
    expect(prisma.$queryRaw.mock.calls[0][0].sql).not.toContain(
      'm."conversationId"::text',
    );
    expect(prisma.$queryRaw.mock.calls[0][0].values).toHaveLength(5002);
    expect(prisma.$queryRaw.mock.calls[1][0].values).toHaveLength(3);
  });

  it('rejects platform administrators and users without an active provider', async () => {
    const { service, prisma } = setup('provider', []);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      systemRole: 'PLATFORM_ADMIN',
      activeProviderId: null,
      providerMemberships: [],
    });
    await expect(
      service.unreadSnapshot('u1', 'provider'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1',
      systemRole: 'USER',
      activeProviderId: null,
      providerMemberships: [],
    });
    await expect(
      service.unreadSnapshot('u1', 'provider'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conversation.findMany).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

function makeService(prisma: any) {
  const internalAuth = {} as any;
  const gateway = {} as any;
  return new ChatService(prisma, internalAuth, gateway);
}

function makeCreatedMessage(overrides: Partial<any> = {}) {
  const createdAt = new Date('2026-10-06T00:00:00.000Z');
  return {
    id: 'm1',
    conversationId: 'c1',
    senderUserId: 'u1',
    clientMessageId: 'cm1',
    body: 'hello',
    createdAt,
    sender: { id: 'u1', name: 'User 1' },
    replyTo: null,
    ...overrides,
  };
}

describe('ChatService.createMessage', () => {
  it('SERVICE: customer message does NOT transition request NEW→DISCUSSING', async () => {
    const prisma = {
      $transaction: vi.fn(async (fn: any) => {
        return await fn({
          message: {
            create: vi.fn().mockResolvedValue(makeCreatedMessage({ senderUserId: 'cu1' })),
          },
          conversation: { update: vi.fn().mockResolvedValue({ id: 'c1' }) },
        });
      }),
      message: { findFirst: vi.fn() },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          requestId: 'r1',
          request: { serviceId: 's1', customerUserId: 'cu1' },
        }),
      },
      request: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };

    const svc = makeService(prisma);
    (svc as any).assertConversationAccess = vi.fn().mockResolvedValue(undefined);
    (svc as any).broadcastMessageCreated = vi.fn().mockResolvedValue(undefined);

    await svc.createMessage('cu1', 'c1', {
      body: 'hello',
      clientMessageId: 'cm1',
    });

    expect(prisma.request.updateMany).not.toHaveBeenCalled();
  });

  it('SERVICE: provider message transitions request NEW→DISCUSSING', async () => {
    const prisma = {
      $transaction: vi.fn(async (fn: any) => {
        return await fn({
          message: {
            create: vi.fn().mockResolvedValue(makeCreatedMessage({ senderUserId: 'pu1' })),
          },
          conversation: { update: vi.fn().mockResolvedValue({ id: 'c1' }) },
        });
      }),
      message: { findFirst: vi.fn() },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          requestId: 'r1',
          request: { serviceId: 's1', customerUserId: 'cu1' },
        }),
      },
      request: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };

    const svc = makeService(prisma);
    (svc as any).assertConversationAccess = vi.fn().mockResolvedValue(undefined);
    (svc as any).broadcastMessageCreated = vi.fn().mockResolvedValue(undefined);

    await svc.createMessage('pu1', 'c1', {
      body: 'hello',
      clientMessageId: 'cm1',
    });

    expect(prisma.request.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'NEW' },
      data: { status: 'DISCUSSING' },
    });
  });

  it('NON-SERVICE: customer message transitions request NEW→DISCUSSING (as before)', async () => {
    const prisma = {
      $transaction: vi.fn(async (fn: any) => {
        return await fn({
          message: {
            create: vi.fn().mockResolvedValue(makeCreatedMessage({ senderUserId: 'cu1' })),
          },
          conversation: { update: vi.fn().mockResolvedValue({ id: 'c1' }) },
        });
      }),
      message: { findFirst: vi.fn() },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          requestId: 'r1',
          request: { serviceId: null, customerUserId: 'cu1' },
        }),
      },
      request: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };

    const svc = makeService(prisma);
    (svc as any).assertConversationAccess = vi.fn().mockResolvedValue(undefined);
    (svc as any).broadcastMessageCreated = vi.fn().mockResolvedValue(undefined);

    await svc.createMessage('cu1', 'c1', {
      body: 'hello',
      clientMessageId: 'cm1',
    });

    expect(prisma.request.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'NEW' },
      data: { status: 'DISCUSSING' },
    });
  });
});


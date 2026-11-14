import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

function makeService(prisma: any, gateway: any = {}) {
  const internalAuth = {} as any;
  return new ChatService(prisma, internalAuth, gateway, {
    consumeReply: vi.fn().mockResolvedValue(undefined),
  } as never);
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
  it('includes the sender photo in the response and realtime event', async () => {
    const image = 'https://example.test/avatar.png';
    const create = vi
      .fn()
      .mockResolvedValue(
        makeCreatedMessage({ sender: { id: 'u1', name: 'User 1', image } }),
      );
    const prisma = {
      $transaction: vi.fn(
        async (fn: any) =>
          await fn({
            message: { create },
            conversation: { update: vi.fn() },
          }),
      ),
      conversation: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const gateway = { emitMessageCreated: vi.fn() };
    const service = makeService(prisma, gateway);
    (service as any).assertConversationAccess = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });
    (service as any).getParticipantUserIds = vi.fn().mockResolvedValue([]);

    const result = await service.createMessage('u1', 'c1', {
      body: 'hello',
      clientMessageId: 'cm1',
    });

    expect(result.message.senderImage).toBe(image);
    expect(gateway.emitMessageCreated).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ senderImage: image }),
      [],
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
              firstName: true,
              lastName: true,
            },
          },
        }),
      }),
    );
  });

  it('replays the same message without broadcasting it again', async () => {
    const prisma = {
      $transaction: vi.fn().mockRejectedValue({ code: 'P2002' }),
      message: { findFirst: vi.fn().mockResolvedValue(makeCreatedMessage()) },
    };
    const svc = makeService(prisma);
    (svc as any).assertConversationAccess = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });
    (svc as any).broadcastMessageCreated = vi.fn();
    await expect(
      svc.createMessage('u1', 'c1', { body: 'hello', clientMessageId: 'cm1' }),
    ).resolves.toMatchObject({ alreadyExisted: true, message: { id: 'm1' } });
    expect((svc as any).broadcastMessageCreated).not.toHaveBeenCalled();
  });

  it('rejects reuse of a message ID with changed text', async () => {
    const prisma = {
      $transaction: vi.fn().mockRejectedValue({ code: 'P2002' }),
      message: { findFirst: vi.fn().mockResolvedValue(makeCreatedMessage()) },
    };
    const svc = makeService(prisma);
    (svc as any).assertConversationAccess = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });
    await expect(
      svc.createMessage('u1', 'c1', {
        body: 'changed',
        clientMessageId: 'cm1',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('SERVICE: customer message does NOT transition request NEW→DISCUSSING', async () => {
    const prisma = {
      $transaction: vi.fn(async (fn: any) => {
        return await fn({
          message: {
            create: vi
              .fn()
              .mockResolvedValue(makeCreatedMessage({ senderUserId: 'cu1' })),
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
    (svc as any).assertConversationAccess = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });
    (svc as any).broadcastMessageCreated = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });

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
            create: vi
              .fn()
              .mockResolvedValue(makeCreatedMessage({ senderUserId: 'pu1' })),
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
    (svc as any).assertConversationAccess = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });
    (svc as any).broadcastMessageCreated = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });

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
            create: vi
              .fn()
              .mockResolvedValue(makeCreatedMessage({ senderUserId: 'cu1' })),
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
    (svc as any).assertConversationAccess = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });
    (svc as any).broadcastMessageCreated = vi
      .fn()
      .mockResolvedValue({ kind: 'REQUEST' });

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

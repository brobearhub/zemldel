import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { RequestRealtimeInterceptor } from './request-realtime.interceptor';
import type { PrismaService } from '../prisma/prisma.service';
import type { ChatGateway } from '../chat/chat.gateway';

function setup(method = 'POST', path = '/pro/requests/:id/complete') {
  const request = {
    method,
    route: { path },
    params: { id: 'r', requestId: 'r', reviewId: 'review', fileId: 'file' },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  const prisma = {
    request: {
      findUnique: vi.fn().mockResolvedValue({
        customerUserId: 'customer',
        providerId: 'selected',
        providerOffers: [{ providerId: 'archived' }],
        conversations: [{ providerId: 'archived' }],
      }),
    },
    providerMember: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { userId: 'selected-user' },
          { userId: 'archived-user' },
          { userId: 'selected-user' },
        ]),
    },
    review: { findUnique: vi.fn().mockResolvedValue({ requestId: 'r' }) },
    requestContractFile: {
      findUnique: vi.fn().mockResolvedValue({ requestId: 'r' }),
    },
  };
  const gateway = { emitRequestChanged: vi.fn() };
  const interceptor = new RequestRealtimeInterceptor(
    prisma as unknown as PrismaService,
    gateway as unknown as ChatGateway,
  );
  return { interceptor, context, prisma, gateway };
}

describe('request realtime invalidation', () => {
  it.each([
    '/pro/requests/:id/complete',
    '/requests/mine/:id/select-provider',
    '/pro/requests/:requestId/payments',
    '/requests/:requestId/reviews',
    '/reviews/:reviewId/reply',
    '/pro/contract-files/:fileId',
  ])('notifies participants after successful %s', async (path) => {
    const { interceptor, context, prisma, gateway } = setup('POST', path);
    let committed = false;
    gateway.emitRequestChanged.mockImplementation(() => {
      expect(committed).toBe(true);
    });
    const stream = await interceptor.intercept(context, {
      handle: () => {
        committed = true;
        return of({ ok: true });
      },
    });
    expect(gateway.emitRequestChanged).not.toHaveBeenCalled();
    expect(await lastValueFrom(stream)).toEqual({ ok: true });
    expect(prisma.providerMember.findMany).toHaveBeenCalledWith({
      where: { providerId: { in: ['selected', 'archived'] }, status: 'ACTIVE' },
      select: { userId: true },
    });
    expect(gateway.emitRequestChanged.mock.calls).toEqual([
      ['selected-user', 'r'],
      ['archived-user', 'r'],
      ['customer', 'r'],
    ]);
  });

  it('does not notify failed or unauthorized writes', async () => {
    const { interceptor, context, gateway } = setup();
    const stream = await interceptor.intercept(context, {
      handle: () => throwError(() => new Error('Forbidden')),
    });
    await expect(lastValueFrom(stream)).rejects.toThrow('Forbidden');
    expect(gateway.emitRequestChanged).not.toHaveBeenCalled();
  });

  it('does not produce refresh loops from reads or unrelated writes', async () => {
    for (const [method, path] of [
      ['GET', '/pro/requests/:id'],
      ['POST', '/chat/conversations/:conversationId/read'],
    ]) {
      const { interceptor, context, gateway, prisma } = setup(method, path);
      await lastValueFrom(
        await interceptor.intercept(context, {
          handle: () => of({ ok: true }),
        }),
      );
      expect(gateway.emitRequestChanged).not.toHaveBeenCalled();
      expect(prisma.request.findUnique).not.toHaveBeenCalled();
    }
  });

  it('preserves a committed HTTP success when notification fails', async () => {
    const { interceptor, context, prisma } = setup();
    prisma.request.findUnique.mockRejectedValue(new Error('offline'));
    expect(
      await lastValueFrom(
        await interceptor.intercept(context, {
          handle: () => of({ ok: true }),
        }),
      ),
    ).toEqual({ ok: true });
  });
});

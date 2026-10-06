import { describe, expect, it, vi } from 'vitest';
import { RequestsService } from './requests.service';

function makeService(prisma: unknown) {
  const svc = new RequestsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    { notifyMessageCreated: vi.fn() } as never,
  );

  // Avoid touching unrelated logic in this unit test.
  (svc as any).getProviderRegionCode = vi.fn().mockResolvedValue('77');
  (svc as any).getProviderEligibleCategoryIds = vi.fn().mockResolvedValue([]);
  (svc as any).resolveRequestsRegionCodes = vi.fn().mockResolvedValue(new Map());
  (svc as any).getConversationCounts = vi.fn().mockResolvedValue(new Map());
  (svc as any).assertProviderEligibleForUnassignedRequest = vi.fn();

  return svc;
}

describe('RequestsService.listProInbox', () => {
  it('NEW: assigned where uses Request.status for SERVICE and message-presence for non-service', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { request: { findMany } };

    const svc = makeService(prisma);
    await svc.listProInbox('p1', { status: 'NEW', dialogScope: 'ACTIVE' });

    const firstCall = findMany.mock.calls[0]?.[0];
    const secondCall = findMany.mock.calls[1]?.[0];

    expect(firstCall).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'p1',
          OR: expect.arrayContaining([
            { serviceId: { not: null }, status: 'NEW' },
            expect.objectContaining({
              serviceId: null,
              NOT: expect.objectContaining({
                conversations: expect.objectContaining({
                  some: expect.objectContaining({
                    providerId: 'p1',
                    messages: { some: {} },
                  }),
                }),
              }),
            }),
          ]),
        }),
      }),
    );

    // Pool is always non-service, should use message-presence logic.
    expect(secondCall).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: null,
          serviceId: null,
          status: { in: ['NEW', 'DISCUSSING'] },
          NOT: expect.objectContaining({
            conversations: expect.objectContaining({
              some: expect.objectContaining({
                providerId: 'p1',
                messages: { some: {} },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('DISCUSSING: assigned where uses Request.status for SERVICE and message-presence for non-service', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { request: { findMany } };

    const svc = makeService(prisma);
    await svc.listProInbox('p1', { status: 'DISCUSSING', dialogScope: 'ACTIVE' });

    const firstCall = findMany.mock.calls[0]?.[0];
    const secondCall = findMany.mock.calls[1]?.[0];

    expect(firstCall).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: 'p1',
          OR: expect.arrayContaining([
            { serviceId: { not: null }, status: { not: 'NEW' } },
            expect.objectContaining({
              serviceId: null,
              conversations: expect.objectContaining({
                some: expect.objectContaining({
                  providerId: 'p1',
                  messages: { some: {} },
                }),
              }),
            }),
          ]),
        }),
      }),
    );

    expect(secondCall).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          providerId: null,
          serviceId: null,
          status: { in: ['NEW', 'DISCUSSING'] },
          conversations: expect.objectContaining({
            some: expect.objectContaining({
              providerId: 'p1',
              messages: { some: {} },
            }),
          }),
        }),
      }),
    );
  });
});


import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

type Actor = {
  readonly id: string;
  readonly systemRole: 'CUSTOMER';
  readonly activeProviderId: string | null;
  readonly providerMemberships: ReadonlyArray<{ readonly providerId: string }>;
};

function makeService(input: {
  readonly actor: Actor;
  readonly customerUserId: string;
}) {
  const conversation = {
    id: 'conversation-a',
    requestId: 'request-1',
    providerId: 'provider-a',
    customerUserId: input.customerUserId,
  };
  const prisma = {
    conversation: {
      findUnique: vi.fn().mockResolvedValue(conversation),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(input.actor),
    },
    request: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'request-1',
        status: 'DISCUSSING',
        serviceId: null,
        categoryId: null,
        requestCityId: null,
        providerId: 'provider-b',
        lockedAt: new Date('2026-11-01T10:00:00.000Z'),
        customerUserId: input.customerUserId,
        customerUser: { customerCityId: null },
      }),
    },
  };

  return new ChatService(prisma as never, {} as never, {} as never);
}

function expectArchivedCode(error: unknown) {
  expect(error).toBeInstanceOf(ForbiddenException);
  expect((error as ForbiddenException).getResponse()).toMatchObject({
    code: 'CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION',
  });
}

describe('ChatService locked FREEFORM access', () => {
  it('разрешает customer читать архивный тред и запрещает писать stable code', async () => {
    const service = makeService({
      customerUserId: 'customer-1',
      actor: {
        id: 'customer-1',
        systemRole: 'CUSTOMER',
        activeProviderId: null,
        providerMemberships: [],
      },
    });

    await expect(
      service.assertConversationAccess('customer-1', 'conversation-a', 'read'),
    ).resolves.toMatchObject({ id: 'conversation-a' });

    await service
      .assertConversationAccess('customer-1', 'conversation-a', 'write')
      .then(() => {
        throw new Error('Ожидался запрет записи');
      }, expectArchivedCode);
  });

  it('разрешает provider своего архивного треда читать и запрещает писать', async () => {
    const service = makeService({
      customerUserId: 'customer-1',
      actor: {
        id: 'provider-user-a',
        systemRole: 'CUSTOMER',
        activeProviderId: 'provider-a',
        providerMemberships: [{ providerId: 'provider-a' }],
      },
    });

    await expect(
      service.assertConversationAccess(
        'provider-user-a',
        'conversation-a',
        'read',
      ),
    ).resolves.toMatchObject({ id: 'conversation-a' });

    await service
      .assertConversationAccess('provider-user-a', 'conversation-a', 'write')
      .then(() => {
        throw new Error('Ожидался запрет записи');
      }, expectArchivedCode);
  });

  it('после reload возвращает выбранный пустой тред customer', async () => {
    const findMany = vi.fn(
      (query: { readonly where: { readonly OR?: ReadonlyArray<unknown> } }) =>
        Promise.resolve(
          query.where.OR
            ? [
                {
                  id: 'conversation-b',
                  providerId: 'provider-b',
                  lastMessageAt: null,
                  createdAt: new Date('2026-11-01T10:00:00.000Z'),
                  provider: { name: 'Provider B' },
                  messages: [],
                },
              ]
            : [],
        ),
    );
    const prisma = {
      request: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'request-1',
          customerUserId: 'customer-1',
          status: 'DISCUSSING',
          providerId: 'provider-b',
          lockedAt: new Date('2026-11-01T10:00:00.000Z'),
        }),
      },
      conversation: { findMany },
    };
    const service = new ChatService(prisma as never, {} as never, {} as never);

    await expect(
      service.listServiceRequestConversationsForCustomer(
        'customer-1',
        'request-1',
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        conversationId: 'conversation-b',
        providerId: 'provider-b',
      }),
    ]);
  });
});

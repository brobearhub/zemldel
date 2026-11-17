import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChatService } from './chat.service';

// Opt in to a dedicated local database only; never run this against the app DB.
const url = process.env.REQUEST_DELETION_TEST_DATABASE_URL;
const allowed =
  url &&
  (() => {
    try {
      const parsed = new URL(url);
      return (
        ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
        parsed.pathname === '/request_deletion_qa'
      );
    } catch {
      return false;
    }
  })();

describe.skipIf(!allowed)('unread snapshot in PostgreSQL', () => {
  let prisma: PrismaClient;
  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url! }),
    });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns real unread counts and removes a deleted request from the full snapshot', async () => {
    const customerId = randomUUID();
    const providerUserId = randomUUID();
    const providerId = randomUUID();
    const requestIds = [randomUUID(), randomUUID()];
    const conversationIds = [randomUUID(), randomUUID()];
    try {
      await prisma.user.createMany({
        data: [
          { id: customerId, email: `${customerId}@example.test` },
          {
            id: providerUserId,
            email: `${providerUserId}@example.test`,
            accountKind: 'PROVIDER',
          },
        ],
      });
      await prisma.provider.create({
        data: {
          id: providerId,
          name: 'Unread QA',
          slug: providerId,
          type: 'INDIVIDUAL',
          members: { create: { userId: providerUserId, role: 'OWNER' } },
        },
      });
      await prisma.user.update({
        where: { id: providerUserId },
        data: { activeProviderId: providerId },
      });
      for (const [index, requestId] of requestIds.entries()) {
        await prisma.request.create({
          data: {
            id: requestId,
            customerUserId: customerId,
            providerId,
            status: 'NEW',
            conversations: {
              create: {
                id: conversationIds[index],
                providerId,
                customerUserId: customerId,
                messages: {
                  create: {
                    senderUserId: customerId,
                    clientMessageId: randomUUID(),
                    body: 'Тестовое сообщение',
                  },
                },
              },
            },
          },
        });
      }
      const chat = new ChatService(prisma as never, {} as never, {} as never);
      expect(await chat.unreadSnapshot(providerUserId, 'provider')).toEqual(
        expect.arrayContaining([
          {
            conversationId: conversationIds[0],
            serviceRequestId: requestIds[0],
            unreadCount: 1,
          },
          {
            conversationId: conversationIds[1],
            serviceRequestId: requestIds[1],
            unreadCount: 1,
          },
        ]),
      );
      await prisma.request.delete({ where: { id: requestIds[0] } });
      expect(await chat.unreadSnapshot(providerUserId, 'provider')).toEqual([
        {
          conversationId: conversationIds[1],
          serviceRequestId: requestIds[1],
          unreadCount: 1,
        },
      ]);
      expect(await chat.unreadSnapshot(customerId, 'customer')).toEqual([
        {
          conversationId: conversationIds[1],
          serviceRequestId: requestIds[1],
          unreadCount: 0,
        },
      ]);
    } finally {
      await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
      await prisma.provider.deleteMany({ where: { id: providerId } });
      await prisma.user.deleteMany({
        where: { id: { in: [customerId, providerUserId] } },
      });
    }
  });
});

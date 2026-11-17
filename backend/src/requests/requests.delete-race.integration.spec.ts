import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

// Opt in only to a dedicated local database, never the application's database.
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

describe.skipIf(!allowed)(
  'request deletion concurrent with provider reply',
  () => {
    let prisma: PrismaClient;
    beforeAll(() => {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url! }),
      });
    });
    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('does not delete a service request after the reply wins the request lock', async () => {
      const customerId = randomUUID();
      const providerUserId = randomUUID();
      const providerId = randomUUID();
      const categoryId = randomUUID();
      const serviceId = randomUUID();
      const requestId = randomUUID();
      const conversationId = randomUUID();
      try {
        await prisma.user.createMany({
          data: [
            { id: customerId, email: `${customerId}@example.test` },
            { id: providerUserId, email: `${providerUserId}@example.test` },
          ],
        });
        await prisma.provider.create({
          data: {
            id: providerId,
            name: 'QA',
            slug: providerId,
            type: 'INDIVIDUAL',
          },
        });
        await prisma.serviceCategory.create({
          data: {
            id: categoryId,
            name: 'QA',
            shortName: 'QA',
            slug: categoryId,
          },
        });
        await prisma.service.create({
          data: {
            id: serviceId,
            providerId,
            categoryId,
            title: 'QA',
            price: '1000',
            status: 'PUBLISHED',
          },
        });
        await prisma.request.create({
          data: {
            id: requestId,
            customerUserId: customerId,
            providerId,
            serviceId,
            lockedAt: new Date(),
            status: 'NEW',
            totalAmountRubles: 1000,
            providerOffers: {
              create: {
                providerId,
                status: 'SELECTED',
                selectedAt: new Date(),
              },
            },
            conversations: {
              create: {
                id: conversationId,
                providerId,
                customerUserId: customerId,
              },
            },
          },
        });

        // Empty document requests/stages and payment rows contain no storage
        // objects and must not prevent deletion before a USER reply.
        await prisma.requestDocumentRequest.create({
          data: { requestId, providerId, title: 'Документ' },
        });
        await prisma.requestWorkStage.create({
          data: {
            requestId,
            providerId,
            title: 'Этап',
            statusKey: 'NEW',
            statusLabel: 'Новый',
          },
        });
        await prisma.requestPayment.create({
          data: { requestId, providerId, amountRubles: 100, comment: 'Аванс' },
        });
        await prisma.message.createMany({
          data: [
            {
              conversationId,
              senderUserId: customerId,
              clientMessageId: randomUUID(),
              body: 'Здравствуйте',
              kind: 'USER',
            },
            {
              conversationId,
              senderUserId: providerUserId,
              clientMessageId: randomUUID(),
              body: 'Изменена цена',
              kind: 'SYSTEM',
            },
          ],
        });
        const service = new RequestsService(
          prisma as unknown as PrismaService,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
        );
        expect(
          (await service.getMineById(customerId, requestId))
            .canDeleteByCustomer,
        ).toBe(true);
        expect(
          (await service.listMine(customerId)).find(
            (item) => item.id === requestId,
          )?.canDeleteByCustomer,
        ).toBe(true);

        let releaseReply!: () => void;
        let replyLocked!: () => void;
        const waitForRelease = new Promise<void>((resolve) => {
          releaseReply = resolve;
        });
        const replyHasLock = new Promise<void>((resolve) => {
          replyLocked = resolve;
        });
        const reply = prisma.$transaction(async (tx) => {
          // ChatService.createMessage uses this same lock before the USER message.
          await tx.$queryRaw`SELECT id FROM "Request" WHERE id = ${requestId}::uuid FOR UPDATE`;
          replyLocked();
          await waitForRelease;
          await tx.message.create({
            data: {
              conversationId,
              senderUserId: providerUserId,
              clientMessageId: randomUUID(),
              body: 'Ответ исполнителя',
              kind: 'USER',
            },
          });
        });
        await replyHasLock;
        const deletion = service.deleteMineByCustomer(customerId, requestId);
        // Observe the rejection immediately so it cannot become unhandled.
        const deletionResult = deletion.then(
          () => null,
          (error: unknown) => error,
        );
        releaseReply();
        await reply;
        expect(await deletionResult).toMatchObject({ status: 409 });
        expect(
          (await service.getMineById(customerId, requestId))
            .canDeleteByCustomer,
        ).toBe(false);
        expect(
          (await service.listMine(customerId)).find(
            (item) => item.id === requestId,
          )?.canDeleteByCustomer,
        ).toBe(false);
        expect(
          await prisma.request.findUnique({ where: { id: requestId } }),
        ).not.toBeNull();
        expect(
          await prisma.message.count({
            where: { conversationId, kind: 'USER' },
          }),
        ).toBe(2);
      } finally {
        await prisma.request.deleteMany({ where: { id: requestId } });
        await prisma.service.deleteMany({ where: { id: serviceId } });
        await prisma.serviceCategory.deleteMany({ where: { id: categoryId } });
        await prisma.provider.deleteMany({ where: { id: providerId } });
        await prisma.user.deleteMany({
          where: { id: { in: [customerId, providerUserId] } },
        });
      }
    });
  },
);

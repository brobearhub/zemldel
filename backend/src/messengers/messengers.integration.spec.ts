import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { MessengerConfig } from './messenger-config';
import { MessengerRepository } from './messenger.repository';
import { MessengerService } from './messenger.service';
import { MessengerApiError, MessengerTransport } from './messenger-transport';
import { MessengerQueueSignal } from './messenger-queue-signal';

// Явный opt-in: создаёт изолированные fixtures и удаляет только их.
describe.skipIf(process.env.MESSENGER_DB_TESTS !== '1')(
  'messengers with PostgreSQL',
  () => {
    const db = new PrismaService();
    const repository = new MessengerRepository(db);
    const config = new MessengerConfig();
    const transport = new MessengerTransport(config);
    const send = vi
      .spyOn(transport, 'send')
      .mockImplementation(() => Promise.resolve(randomUUID()));
    // Socket.io — внешняя граница; данные, права и транзакции настоящие.
    const chat = new ChatService(db, new InternalAuthService(), {
      emitMessageCreated: vi.fn(),
      emitUnreadHint: vi.fn(),
    } as never);
    const service = new MessengerService(repository, chat, config, transport);
    const users = [randomUUID(), randomUUID(), randomUUID()];
    let providerId: string;
    let categoryId: string;
    let requestId: string;
    let conversationId: string;
    let deliveredId: string;
    const external = String(
      Math.floor(Math.random() * 1000000000) + 1000000000,
    );

    beforeAll(async () => {
      vi.spyOn(config, 'configured').mockReturnValue(true);
      vi.spyOn(config, 'bot').mockReturnValue({
        token: 'test',
        username: 'test_bot',
        secret: '1234567890123456',
      });
      await db.user.createMany({
        data: users.map((id) => ({
          id,
          email: `qa-messenger-${id}@example.com`,
        })),
      });
      const category = await db.serviceCategory.create({
        data: { name: 'QA', shortName: 'QA', slug: randomUUID() },
      });
      categoryId = category.id;
      const provider = await db.provider.create({
        data: {
          name: 'QA',
          slug: randomUUID(),
          type: 'COMPANY',
          ownerUserId: users[1],
          members: {
            create: { userId: users[1], role: 'OWNER', status: 'ACTIVE' },
          },
        },
      });
      providerId = provider.id;
      const offering = await db.service.create({
        data: { title: 'QA', price: '100', categoryId, providerId },
      });
      const request = await db.request.create({
        data: { customerUserId: users[0], providerId, serviceId: offering.id },
      });
      requestId = request.id;
      conversationId = (
        await db.conversation.create({
          data: { requestId, providerId, customerUserId: users[0] },
        })
      ).id;
    });
    afterAll(async () => {
      await db.request.deleteMany({ where: { customerUserId: { in: users } } });
      if (providerId)
        await db.provider.deleteMany({ where: { id: providerId } });
      if (categoryId)
        await db.serviceCategory.deleteMany({ where: { id: categoryId } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
      vi.restoreAllMocks();
    });

    it('notifies only after commit and recovers work created while the listener was offline', async () => {
      const signal = new MessengerQueueSignal(config);
      const notified = vi.fn();
      const body = 'Transactional queue signal';
      try {
        signal.start(notified);
        await vi.waitFor(() => expect(notified).toHaveBeenCalledTimes(1));
        await db.$transaction(async (tx) => {
          await tx.message.create({
            data: {
              conversationId,
              senderUserId: users[0],
              clientMessageId: randomUUID(),
              body,
              messengerOutbox: { create: {} },
            },
          });
          await new Promise((resolve) => setTimeout(resolve, 40));
          expect(notified).toHaveBeenCalledTimes(1);
        });
        await vi.waitFor(() => expect(notified).toHaveBeenCalledTimes(2));
        await expect(
          db.$transaction(async (tx) => {
            await tx.message.create({
              data: {
                conversationId,
                senderUserId: users[0],
                clientMessageId: randomUUID(),
                body: 'rollback',
                messengerOutbox: { create: {} },
              },
            });
            throw new Error('rollback');
          }),
        ).rejects.toThrow('rollback');
        await new Promise((resolve) => setTimeout(resolve, 40));
        expect(notified).toHaveBeenCalledTimes(2);
        expect(
          await db.message.count({
            where: { conversationId, body: 'rollback' },
          }),
        ).toBe(0);
        await signal.stop();
        const offline = await chat.createMessage(users[0], conversationId, {
          body: 'Created offline',
          clientMessageId: randomUUID(),
        });
        signal.start(notified);
        await vi.waitFor(() => expect(notified).toHaveBeenCalledTimes(3));
        expect(
          (await repository.pendingEvents()).map((event) => event.messageId),
        ).toContain(offline.message.id);
        for (const event of await repository.pendingEvents())
          await repository.expand(event.messageId);
        expect(await repository.nextWakeAt()).toBeNull();
      } finally {
        await signal.stop();
      }
    });

    it('delivers to MAX and imports its reply into the same conversation', async () => {
      const connection = await db.messengerConnection.create({
        data: {
          userId: users[0],
          platform: 'MAX',
          externalUserId: external,
          chatId: external,
          displayName: 'MAX QA',
        },
      });
      const original = await chat.createMessage(users[1], conversationId, {
        body: 'Сообщение для MAX',
        clientMessageId: randomUUID(),
      });
      await service.tick();
      const delivery = await db.messengerDelivery.findFirstOrThrow({
        where: { messageId: original.message.id, connectionId: connection.id },
      });
      expect(delivery.status).toBe('SENT');
      expect(send).toHaveBeenCalledWith(
        'MAX',
        external,
        expect.stringContaining('Сообщение для MAX'),
        expect.any(String),
      );
      const event = {
        update_type: 'message_created',
        message: {
          sender: { user_id: Number(external) },
          recipient: { chat_id: Number(external), chat_type: 'dialog' },
          timestamp: Date.now(),
          body: { mid: 'max-incoming', text: 'Ответ из MAX' },
          link: { type: 'reply', message: { mid: delivery.externalMessageId } },
        },
      };
      await service.receive('MAX', event);
      await service.receive('MAX', event);
      const messages = await db.message.findMany({
        where: { conversationId, body: 'Ответ из MAX' },
      });
      expect(messages).toHaveLength(1);
      expect(messages[0].senderUserId).toBe(users[0]);
      expect(messages[0].replyToMessageId).toBe(original.message.id);
      await repository.disconnect(users[0], 'MAX');
    });

    it('does not accept an expired link', async () => {
      const token = await repository.createLink(
        users[2],
        'MAX',
        randomUUID(),
        new Date(0),
      );
      expect(
        await repository.captureLink('MAX', token.tokenHash, {
          kind: 'start',
          externalUserId: external,
          chatId: external,
          displayName: 'QA',
        }),
      ).toBe(false);
      await expect(
        repository.confirm(users[2], 'MAX', token.id),
      ).rejects.toThrow();
    });

    it('requires a valid secret before accepting webhook events', () => {
      expect(() => service.verifyWebhook('TELEGRAM', undefined)).toThrow();
      expect(() =>
        service.verifyWebhook('TELEGRAM', '0000000000000000'),
      ).toThrow();
      expect(() =>
        service.verifyWebhook('TELEGRAM', '1234567890123456'),
      ).not.toThrow();
    });

    it('requires site confirmation; rejects a different owner and duplicate external account', async () => {
      const link = await service.createLink(users[1], 'TELEGRAM');
      const payload = new URL(link.url).searchParams.get('start');
      await service.receive('TELEGRAM', {
        message: {
          message_id: 1,
          date: Date.now() / 1000,
          from: { id: Number(external), first_name: 'QA' },
          chat: { id: Number(external), type: 'private' },
          text: `/start ${payload}`,
        },
      });
      expect(await repository.connection('TELEGRAM', external)).toBeNull();
      const pending = (await service.status(users[1]))[0].pending!;
      const capturedToken = await db.messengerLinkToken.findUniqueOrThrow({
        where: { id: pending.id },
      });
      const replayedStart = {
        kind: 'start' as const,
        externalUserId: external,
        chatId: external,
        displayName: 'QA',
      };
      // Long polling may replay /start after a lost reply or process restart.
      expect(
        await repository.captureLink(
          'TELEGRAM',
          capturedToken.tokenHash,
          replayedStart,
        ),
      ).toBe(true);
      expect(
        await repository.captureLink('TELEGRAM', capturedToken.tokenHash, {
          ...replayedStart,
          externalUserId: 'another-account',
          chatId: 'another-account',
        }),
      ).toBe(false);
      expect(
        await repository.captureLink('TELEGRAM', capturedToken.tokenHash, {
          ...replayedStart,
          chatId: 'another-chat',
        }),
      ).toBe(false);
      await expect(
        service.confirm(users[2], 'TELEGRAM', pending.id),
      ).rejects.toThrow();
      await service.confirm(users[1], 'TELEGRAM', pending.id);
      await service.confirm(users[1], 'TELEGRAM', pending.id);
      expect((await repository.connection('TELEGRAM', external))?.userId).toBe(
        users[1],
      );
      const other = await repository.createLink(
        users[2],
        'TELEGRAM',
        randomUUID(),
        new Date(Date.now() + 60000),
      );
      await repository.captureLink('TELEGRAM', other.tokenHash, {
        kind: 'start',
        externalUserId: external,
        chatId: external,
        displayName: 'QA',
      });
      await expect(
        service.confirm(users[2], 'TELEGRAM', other.id),
      ).rejects.toThrow('уже подключён');
    });

    it('stores a message and outbox atomically, expands once and claims delivery once across workers', async () => {
      const input = {
        body: 'Когда сможете приехать?',
        clientMessageId: randomUUID(),
      };
      const created = await chat.createMessage(users[0], conversationId, input);
      await chat.createMessage(users[0], conversationId, input);
      expect(
        await db.messengerOutbox.count({
          where: { messageId: created.message.id },
        }),
      ).toBe(1);
      await Promise.all([
        repository.expand(created.message.id),
        repository.expand(created.message.id),
      ]);
      expect(
        await db.messengerDelivery.count({
          where: { messageId: created.message.id },
        }),
      ).toBe(1);
      const results = await Promise.all([
        repository.claimDeliveries(),
        repository.claimDeliveries(),
      ]);
      const claimed = results
        .flat()
        .filter((d) => d.messageId === created.message.id);
      expect(claimed).toHaveLength(1);
      deliveredId = claimed[0].id;
      await repository.finish(deliveredId, claimed[0].leaseToken, {
        status: 'SENT',
        externalMessageId: '555',
      });
      await repository.releaseConnection(claimed[0].connectionId);
    });

    it('routes two copies of a reply to one site message; never replies to another user notification', async () => {
      const input = {
        message: {
          message_id: 10,
          date: Math.ceil(Date.now() / 1000),
          from: { id: Number(external) },
          chat: { id: Number(external), type: 'private' },
          text: 'Завтра',
          reply_to_message: { message_id: 555 },
        },
      };
      await Promise.all([
        service.receive('TELEGRAM', input),
        service.receive('TELEGRAM', input),
      ]);
      expect(
        await db.message.count({ where: { conversationId, body: 'Завтра' } }),
      ).toBe(1);
      expect(
        (
          await db.message.findFirstOrThrow({
            where: { conversationId, body: 'Завтра' },
          })
        ).senderUserId,
      ).toBe(users[1]);
      const otherId = Number(external) + 1;
      await db.messengerConnection.create({
        data: {
          userId: users[2],
          platform: 'TELEGRAM',
          externalUserId: String(otherId),
          chatId: String(otherId),
          displayName: 'QA stranger',
        },
      });
      await service.receive('TELEGRAM', {
        message: {
          ...input.message,
          message_id: 11,
          from: { id: otherId },
          chat: { id: otherId, type: 'private' },
          text: 'Чужой ответ',
        },
      });
      expect(
        await db.message.count({
          where: { body: 'Чужой ответ', conversationId },
        }),
      ).toBe(0);
    });

    it('rejects replies after access revocation and cancels queued delivery', async () => {
      const message = await chat.createMessage(users[0], conversationId, {
        body: 'Новое сообщение',
        clientMessageId: randomUUID(),
      });
      await repository.expand(message.message.id);
      await db.providerMember.updateMany({
        where: { providerId, userId: users[1] },
        data: { status: 'SUSPENDED' },
      });
      await db.messengerConnection.updateMany({
        where: { userId: users[1] },
        data: { nextSendAt: new Date(0) },
      });
      send.mockClear();
      await service.tick();
      expect(send).not.toHaveBeenCalled();
      expect(
        (
          await db.messengerDelivery.findFirstOrThrow({
            where: { messageId: message.message.id },
          })
        ).status,
      ).toBe('CANCELLED');
      await service.receive('TELEGRAM', {
        message: {
          message_id: 12,
          date: Math.ceil(Date.now() / 1000),
          from: { id: Number(external) },
          chat: { id: Number(external), type: 'private' },
          text: 'Недоступный ответ',
          reply_to_message: { message_id: 555 },
        },
      });
      expect(
        await db.message.count({
          where: { conversationId, body: 'Недоступный ответ' },
        }),
      ).toBe(0);
      await db.providerMember.updateMany({
        where: { providerId, userId: users[1] },
        data: { status: 'ACTIVE' },
      });
    });

    it('retries a transient API failure and cancels pending delivery on disconnect', async () => {
      const message = await chat.createMessage(users[0], conversationId, {
        body: 'Retry',
        clientMessageId: randomUUID(),
      });
      await db.messengerConnection.updateMany({
        where: { userId: users[1] },
        data: { nextSendAt: new Date(0) },
      });
      send.mockRejectedValueOnce(new MessengerApiError(429, 60));
      await service.tick();
      const delivery = await db.messengerDelivery.findFirstOrThrow({
        where: { messageId: message.message.id },
      });
      expect(delivery.status).toBe('PENDING');
      expect(delivery.nextAttemptAt.getTime()).toBeGreaterThan(
        Date.now() + 55000,
      );
      expect(await repository.nextWakeAt()).toEqual(delivery.nextAttemptAt);
      const later = await chat.createMessage(users[0], conversationId, {
        body: 'Не обгонять отложенное сообщение',
        clientMessageId: randomUUID(),
      });
      await repository.expand(later.message.id);
      await db.messengerConnection.updateMany({
        where: { userId: users[1] },
        data: { nextSendAt: new Date(0) },
      });
      // Более позднее задание уже готово, но не должно вызвать холостой цикл
      // планировщика или обогнать первую отправку с Retry-After.
      expect(await repository.nextWakeAt()).toEqual(delivery.nextAttemptAt);
      expect(await repository.claimDeliveries()).toHaveLength(0);
      await repository.disconnect(users[1], 'TELEGRAM');
      expect(
        await db.messengerDelivery.count({ where: { id: delivery.id } }),
      ).toBe(0);
      expect(await repository.connection('TELEGRAM', external)).toBeNull();
      expect(await repository.nextWakeAt()).toBeNull();
    });
  },
);

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type MessengerPlatform } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { MessengerEvent } from './messenger-events';
import { splitMessage } from './messenger-events';

@Injectable()
export class MessengerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async status(userId: string) {
    const [connections, tokens] = await Promise.all([
      this.prisma.messengerConnection.findMany({ where: { userId } }),
      this.prisma.messengerLinkToken.findMany({
        where: { userId, confirmedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    return { connections, tokens };
  }

  async createLink(
    userId: string,
    platform: MessengerPlatform,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const connection = await tx.messengerConnection.findUnique({
          where: { userId_platform: { userId, platform } },
        });
        if (connection)
          throw new ConflictException('Сначала отключите текущий аккаунт');
        return tx.messengerLinkToken.upsert({
          where: { userId_platform: { userId, platform } },
          create: { userId, platform, tokenHash, expiresAt },
          update: {
            id: randomUUID(),
            tokenHash,
            expiresAt,
            externalUserId: null,
            chatId: null,
            displayName: null,
            confirmedAt: null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async captureLink(
    platform: MessengerPlatform,
    tokenHash: string,
    event: MessengerEvent,
  ): Promise<boolean> {
    const result = await this.prisma.messengerLinkToken.updateMany({
      where: {
        platform,
        tokenHash,
        expiresAt: { gt: new Date() },
        confirmedAt: null,
        OR: [
          { externalUserId: null },
          { externalUserId: event.externalUserId, chatId: event.chatId },
        ],
      },
      data: {
        externalUserId: event.externalUserId,
        chatId: event.chatId,
        displayName: event.displayName,
      },
    });
    return result.count === 1;
  }

  async confirm(userId: string, platform: MessengerPlatform, tokenId: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const token = await tx.messengerLinkToken.findFirst({
            where: {
              id: tokenId,
              userId,
              platform,
              expiresAt: { gt: new Date() },
            },
          });
          if (!token?.externalUserId || !token.chatId || !token.displayName)
            throw new NotFoundException(
              'Ссылка истекла или бот ещё не запущен',
            );
          if (token.confirmedAt) return;
          const claimed = await tx.messengerLinkToken.updateMany({
            where: { id: token.id, confirmedAt: null },
            data: { confirmedAt: new Date() },
          });
          if (!claimed.count) return;
          await tx.messengerConnection.create({
            data: {
              userId,
              platform,
              externalUserId: token.externalUserId,
              chatId: token.chatId,
              displayName: token.displayName,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Этот аккаунт уже подключён. Отключите его в прежнем профиле.',
        );
      }
      throw error;
    }
  }

  async disconnect(userId: string, platform: MessengerPlatform) {
    await this.prisma.$transaction(
      [
        this.prisma.messengerLinkToken.deleteMany({
          where: { userId, platform },
        }),
        this.prisma.messengerConnection.deleteMany({
          where: { userId, platform },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async notifications(
    userId: string,
    platform: MessengerPlatform,
    enabled: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const connection = await tx.messengerConnection.findUnique({
        where: { userId_platform: { userId, platform } },
      });
      if (!connection) throw new NotFoundException('Мессенджер не подключён');
      await tx.messengerConnection.update({
        where: { id: connection.id },
        data: { notificationsEnabled: enabled },
      });
      if (!enabled)
        await tx.messengerDelivery.updateMany({
          where: { connectionId: connection.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
    });
  }

  connection(platform: MessengerPlatform, externalUserId: string) {
    return this.prisma.messengerConnection.findUnique({
      where: { platform_externalUserId: { platform, externalUserId } },
    });
  }

  async blocked(
    platform: MessengerPlatform,
    externalUserId: string,
    blocked: boolean,
  ) {
    await this.prisma.messengerConnection.updateMany({
      where: { platform, externalUserId },
      data: { blockedAt: blocked ? new Date() : null },
    });
  }

  replyTarget(connectionId: string, externalMessageId: string) {
    return this.prisma.messengerDelivery.findUnique({
      where: {
        connectionId_externalMessageId: { connectionId, externalMessageId },
      },
      select: {
        messageId: true,
        message: { select: { conversationId: true } },
      },
    });
  }

  pendingEvents() {
    return this.prisma.messengerOutbox.findMany({
      where: { expandedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }

  async expand(messageId: string) {
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.messengerOutbox.updateMany({
        where: { messageId, expandedAt: null },
        data: { expandedAt: new Date() },
      });
      if (!claim.count) return;
      const message = await tx.message.findUniqueOrThrow({
        where: { id: messageId },
        include: { conversation: true },
      });
      const members = await tx.providerMember.findMany({
        where: {
          providerId: message.conversation.providerId,
          status: 'ACTIVE',
        },
        select: { userId: true },
      });
      const userIds = [
        message.conversation.customerUserId,
        ...members.map((m) => m.userId),
      ].filter((id) => id !== message.senderUserId);
      const connections = await tx.messengerConnection.findMany({
        where: {
          userId: { in: userIds },
          notificationsEnabled: true,
          blockedAt: null,
          createdAt: { lte: message.createdAt },
        },
        select: { id: true },
      });
      const parts = splitMessage(message.body);
      if (connections.length)
        await tx.messengerDelivery.createMany({
          data: connections.flatMap((c) =>
            parts.map((_, part) => ({ messageId, connectionId: c.id, part })),
          ),
          skipDuplicates: true,
        });
    });
  }

  async claimDeliveries() {
    const now = new Date();
    // DISTINCT ON выбирает именно голову каждой очереди, включая отложенные
    // задания. Иначе более поздняя часть мешает выбрать готового получателя.
    const candidates = await this.prisma.$queryRaw<
      Array<{ id: string; connectionId: string }>
    >`
      SELECT head."id", head."connectionId"
      FROM (
        SELECT DISTINCT ON ("connectionId") "id", "connectionId", "nextAttemptAt", "createdAt", "part"
        FROM "MessengerDelivery" WHERE "status" = 'PENDING'
        ORDER BY "connectionId", "createdAt", "part", "id"
      ) head JOIN "MessengerConnection" c ON c."id" = head."connectionId"
      WHERE head."nextAttemptAt" <= ${now} AND c."nextSendAt" <= ${now}
      ORDER BY head."createdAt", head."part", head."id" LIMIT 40
    `;
    const claimed: string[] = [];
    const seen = new Set<string>();
    for (const row of candidates) {
      if (seen.has(row.connectionId)) continue;
      seen.add(row.connectionId);
      const lease = randomUUID();
      const ok = await this.prisma.$transaction(async (tx) => {
        const connection = await tx.messengerConnection.updateMany({
          where: { id: row.connectionId, nextSendAt: { lte: now } },
          data: { nextSendAt: new Date(now.getTime() + 15_000) },
        });
        if (!connection.count) return false;
        // Не обгоняем предыдущее сообщение или предыдущую часть при повторной доставке.
        const first = await tx.messengerDelivery.findFirst({
          where: { connectionId: row.connectionId, status: 'PENDING' },
          orderBy: [{ createdAt: 'asc' }, { part: 'asc' }, { id: 'asc' }],
        });
        if (first?.id !== row.id || first.nextAttemptAt > now) return false;
        const result = await tx.messengerDelivery.updateMany({
          where: { id: row.id, status: 'PENDING', nextAttemptAt: { lte: now } },
          data: {
            leaseToken: lease,
            nextAttemptAt: new Date(now.getTime() + 120_000),
            attempts: { increment: 1 },
          },
        });
        return result.count === 1;
      });
      if (ok) claimed.push(row.id);
      if (claimed.length >= 10) break;
    }
    return this.prisma.messengerDelivery.findMany({
      where: { id: { in: claimed } },
      include: {
        connection: true,
        message: {
          include: {
            sender: { select: { name: true } },
            conversation: { select: { requestId: true, customerUserId: true } },
          },
        },
      },
    });
  }

  async nextWakeAt(): Promise<Date | null> {
    const pendingEvent = await this.prisma.messengerOutbox.findFirst({
      where: { expandedAt: null },
      select: { messageId: true },
    });
    if (pendingEvent) return new Date();
    // Prisma не выражает min(max(дата задания, дата подключения)) по головам
    // очередей. Один запрос учитывает backoff, lease и ограничение частоты.
    const [result] = await this.prisma.$queryRaw<Array<{ at: Date | null }>>`
      SELECT min(greatest(head."nextAttemptAt", c."nextSendAt")) AS "at"
      FROM (
        SELECT DISTINCT ON ("connectionId") "connectionId", "nextAttemptAt"
        FROM "MessengerDelivery" WHERE "status" = 'PENDING'
        ORDER BY "connectionId", "createdAt", "part", "id"
      ) head JOIN "MessengerConnection" c ON c."id" = head."connectionId"
    `;
    return result?.at ?? null;
  }

  async finish(
    id: string,
    leaseToken: string | null,
    data: Prisma.MessengerDeliveryUpdateManyMutationInput,
  ) {
    await this.prisma.messengerDelivery.updateMany({
      where: { id, leaseToken, status: 'PENDING' },
      data: { ...data, leaseToken: null },
    });
  }

  async releaseConnection(id: string) {
    await this.prisma.messengerConnection.updateMany({
      where: { id },
      data: { nextSendAt: new Date(Date.now() + 1000) },
    });
  }
}

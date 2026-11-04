import {
  ForbiddenException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { MessengerPlatform } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ChatService } from '../chat/chat.service';
import { MessengerConfig } from './messenger-config';
import {
  incomingMessageUuid,
  parseMessengerEvent,
  splitMessage,
} from './messenger-events';
import { MessengerRepository } from './messenger.repository';
import { MessengerApiError, MessengerTransport } from './messenger-transport';

const PLATFORMS: MessengerPlatform[] = ['TELEGRAM', 'MAX'];
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class MessengerService {
  constructor(
    private readonly repository: MessengerRepository,
    private readonly chat: ChatService,
    private readonly config: MessengerConfig,
    private readonly transport: MessengerTransport,
  ) {}

  async status(userId: string) {
    const { connections, tokens } = await this.repository.status(userId);
    return PLATFORMS.map((platform) => {
      const connection = connections.find((c) => c.platform === platform);
      const pending = tokens.find((t) => t.platform === platform);
      return {
        platform,
        configured: this.config.configured(platform),
        connected: Boolean(connection),
        displayName: connection?.displayName ?? null,
        notificationsEnabled: connection?.notificationsEnabled ?? false,
        blocked: Boolean(connection?.blockedAt),
        pending: pending
          ? {
              id: pending.id,
              displayName: pending.displayName,
              expiresAt: pending.expiresAt.toISOString(),
            }
          : null,
      };
    });
  }

  async createLink(userId: string, platform: MessengerPlatform) {
    if (!this.config.configured(platform))
      throw new ServiceUnavailableException(
        'Подключение этого мессенджера пока недоступно',
      );
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.repository.createLink(userId, platform, hash(token), expiresAt);
    const host = platform === 'TELEGRAM' ? 'https://t.me' : 'https://max.ru';
    return {
      url: `${host}/${this.config.bot(platform).username}?start=${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  confirm(userId: string, platform: MessengerPlatform, tokenId: string) {
    return this.repository.confirm(userId, platform, tokenId);
  }
  disconnect(userId: string, platform: MessengerPlatform) {
    return this.repository.disconnect(userId, platform);
  }
  notifications(userId: string, platform: MessengerPlatform, enabled: boolean) {
    return this.repository.notifications(userId, platform, enabled);
  }

  verifyWebhook(platform: MessengerPlatform, secret: string | undefined) {
    const expected = this.config.bot(platform).secret;
    if (
      !expected ||
      !secret ||
      Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
    ) {
      throw new UnauthorizedException();
    }
  }

  async receive(platform: MessengerPlatform, input: unknown): Promise<void> {
    const event = parseMessengerEvent(platform, input);
    if (!event) return;
    if (event.kind === 'stop') {
      await this.repository.blocked(platform, event.externalUserId, true);
      return;
    }
    if (event.kind === 'start') {
      if (event.payload && /^[A-Za-z0-9_-]{32}$/.test(event.payload)) {
        const captured = await this.repository.captureLink(
          platform,
          hash(event.payload),
          event,
        );
        await this.transport.send(
          platform,
          event.chatId,
          captured
            ? 'Вернитесь на сайт и подтвердите подключение этого аккаунта в разделе «Мессенджеры».'
            : 'Ссылка уже использована или истекла. Проверьте подключение на сайте или создайте новую ссылку.',
        );
      } else {
        const connection = await this.repository.connection(
          platform,
          event.externalUserId,
        );
        if (connection?.chatId === event.chatId)
          await this.repository.blocked(platform, event.externalUserId, false);
        await this.transport.send(
          platform,
          event.chatId,
          connection
            ? 'Вы подключены. Для ответа клиенту или исполнителю используйте «Ответить» на нужном уведомлении. Сообщения также доступны на сайте.'
            : 'Подключите мессенджер в личном кабинете сайта: «Мессенджеры» → «Подключить».',
        );
      }
      return;
    }
    const connection = await this.repository.connection(
      platform,
      event.externalUserId,
    );
    if (!connection || connection.chatId !== event.chatId) {
      await this.transport.send(
        platform,
        event.chatId,
        'Сначала подключите этот аккаунт в личном кабинете сайта.',
      );
      return;
    }
    // Старые события после перепривязки не должны создавать новые сообщения.
    if (
      !event.timestamp ||
      event.timestamp < Math.floor(connection.createdAt.getTime() / 1000) * 1000
    )
      return;
    const target = event.replyId
      ? await this.repository.replyTarget(connection.id, event.replyId)
      : null;
    if (!target) {
      await this.transport.send(
        platform,
        event.chatId,
        'Выберите уведомление о нужной заявке и нажмите «Ответить» на нём. Так ответ попадёт нужному собеседнику.',
      );
      return;
    }
    if (!event.text?.trim()) {
      await this.transport.send(
        platform,
        event.chatId,
        'Пока поддерживаются текстовые ответы. Файлы и другие действия доступны на сайте.',
      );
      return;
    }
    try {
      await this.chat.createMessage(
        connection.userId,
        target.message.conversationId,
        {
          body: event.text,
          replyToMessageId: target.messageId,
          clientMessageId: incomingMessageUuid(
            platform,
            event.chatId,
            event.messageId!,
          ),
        },
      );
    } catch (error) {
      if (
        error instanceof HttpException &&
        [400, 403, 404, 409].includes(error.getStatus())
      ) {
        await this.transport.send(
          platform,
          event.chatId,
          'Ответ не отправлен: чат недоступен для записи или сообщение изменилось. Откройте заявку на сайте.',
        );
        return;
      }
      throw error;
    }
  }

  async tick(): Promise<void> {
    for (const event of await this.repository.pendingEvents())
      await this.repository.expand(event.messageId);
    const deliveries = await this.repository.claimDeliveries();
    // Дожидаемся всех отправок даже при ошибке БД в одной из них.
    const results = await Promise.allSettled(
      deliveries.map((delivery) => this.deliver(delivery)),
    );
    if (results.some((result) => result.status === 'rejected')) {
      throw new AggregateError([], 'Messenger batch incomplete');
    }
  }

  private async deliver(
    delivery: Awaited<
      ReturnType<MessengerRepository['claimDeliveries']>
    >[number],
  ) {
    const { connection, message } = delivery;
    try {
      const current = await this.repository.connection(
        connection.platform,
        connection.externalUserId,
      );
      if (
        current?.id !== connection.id ||
        !current.notificationsEnabled ||
        current.blockedAt
      ) {
        await this.repository.finish(delivery.id, delivery.leaseToken, {
          status: 'CANCELLED',
        });
        return;
      }
      await this.chat.assertConversationAccess(
        connection.userId,
        message.conversationId,
        'read',
      );
      if (!this.config.configured(connection.platform))
        throw new MessengerApiError(503);
      const parts = splitMessage(message.body);
      const suffix =
        parts.length > 1 ? ` · ${delivery.part + 1}/${parts.length}` : '';
      const text = `Заявка №${message.conversation.requestId.slice(0, 8)}${suffix}\n${(message.sender.name ?? 'Собеседник').slice(0, 100)}:\n\n${parts[delivery.part]}\n\nИспользуйте «Ответить» на этом сообщении.`;
      const customer =
        connection.userId === message.conversation.customerUserId;
      const link = `${this.config.siteUrl}/${customer ? 'profile' : 'pro'}/requests/${message.conversation.requestId}?conversationId=${message.conversationId}`;
      const externalMessageId = await this.transport.send(
        connection.platform,
        connection.chatId,
        text,
        link,
      );
      await this.repository.finish(delivery.id, delivery.leaseToken, {
        status: 'SENT',
        externalMessageId,
        lastError: null,
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        (error instanceof HttpException && error.getStatus() === 404)
      ) {
        await this.repository.finish(delivery.id, delivery.leaseToken, {
          status: 'CANCELLED',
          lastError: 'ACCESS_REVOKED',
        });
      } else {
        const status = error instanceof MessengerApiError ? error.status : 0;
        if (status === 403)
          await this.repository.blocked(
            connection.platform,
            connection.externalUserId,
            true,
          );
        const permanent =
          [400, 401, 403, 404].includes(status) || delivery.attempts >= 8;
        const seconds = Math.max(
          Math.min(3600, 5 * 2 ** delivery.attempts),
          error instanceof MessengerApiError ? error.retryAfter : 0,
        );
        await this.repository.finish(delivery.id, delivery.leaseToken, {
          status: permanent ? 'FAILED' : 'PENDING',
          nextAttemptAt: new Date(Date.now() + seconds * 1000),
          lastError: `API_${status}`,
        });
      }
    } finally {
      await this.repository.releaseConnection(connection.id);
    }
  }
}

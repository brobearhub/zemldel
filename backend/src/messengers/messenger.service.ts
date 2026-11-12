import {
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { MessengerConnection, MessengerPlatform } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ChatService } from '../chat/chat.service';
import { MessengerConfig } from './messenger-config';
import {
  incomingMessageUuid,
  parseMessengerEvent,
  splitMessage,
  type MessengerEvent,
} from './messenger-events';
import { MessengerRepository } from './messenger.repository';
import { MessengerApiError, MessengerTransport } from './messenger-transport';
import { messengerWelcomeMessage } from './messenger-welcome';

const PLATFORMS: MessengerPlatform[] = ['TELEGRAM', 'MAX'];
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
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
      const pending = connection
        ? undefined
        : tokens.find((t) => t.platform === platform);
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
            ? messengerWelcomeMessage(this.config.siteUrl, 'pending')
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
          messengerWelcomeMessage(
            this.config.siteUrl,
            connection?.chatId === event.chatId ? 'connected' : 'unlinked',
          ),
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
    if (event.kind === 'callback') {
      await this.selectReply(connection, event);
      return;
    }
    // Старые события после перепривязки не должны создавать новые сообщения.
    if (
      !event.timestamp ||
      event.timestamp < Math.floor(connection.createdAt.getTime() / 1000) * 1000
    )
      return;
    if (event.text?.trim() === '/cancel') {
      await this.repository.cancelReply(connection.id, event.eventOrder);
      await this.transport.send(
        platform,
        event.chatId,
        'Выбор заявки отменён. Для нового ответа нажмите «Ответить здесь» под нужным уведомлением.',
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
    const messageId = incomingMessageUuid(
      platform,
      event.chatId,
      event.messageId!,
    );
    const target = event.replyId
      ? await this.repository.replyTarget(connection.id, event.replyId)
      : await this.repository.claimReply(
          connection.id,
          messageId,
          event.eventOrder,
        );
    if (!target) {
      await this.transport.send(
        platform,
        event.chatId,
        'Нажмите «Ответить здесь» под уведомлением о нужной заявке, затем напишите ответ. Также можно использовать обычную функцию «Ответить» на уведомлении.',
      );
      return;
    }
    if (event.replyId)
      await this.repository.cancelReply(connection.id, event.eventOrder);
    try {
      await this.chat.createMessage(
        connection.userId,
        target.message.conversationId,
        {
          body: event.text,
          replyToMessageId: target.messageId,
          clientMessageId: messageId,
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

  private async selectReply(
    connection: MessengerConnection,
    event: MessengerEvent,
  ) {
    const deliveryId =
      /^reply:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
        event.payload ?? '',
      )?.[1];
    const target = deliveryId
      ? await this.repository.buttonTarget(
          connection.id,
          deliveryId,
          event.messageId!,
        )
      : null;
    let selected = false;
    let accessible = false;
    if (target) {
      try {
        await this.chat.assertConversationAccess(
          connection.userId,
          target.message.conversationId,
          'write',
        );
        accessible = true;
        selected = await this.repository.selectReply(
          connection.id,
          target.id,
          incomingMessageUuid(
            connection.platform,
            connection.chatId,
            `callback:${event.callbackId}:${event.eventOrder}`,
          ),
          event.eventOrder!,
        );
      } catch (error) {
        if (
          !(
            error instanceof HttpException &&
            [403, 404].includes(error.getStatus())
          )
        )
          throw error;
      }
    }
    if (!selected)
      await this.repository.cancelReply(connection.id, event.eventOrder);
    try {
      await this.transport.answerCallback(
        connection.platform,
        event.callbackId!,
        target && accessible
          ? this.notification(connection.userId, target)
          : undefined,
      );
    } catch (error) {
      // Expired callback acknowledgements must not discard an already saved selection.
      this.logger.warn(
        `Не удалось подтвердить кнопку: ${error instanceof MessengerApiError ? error.status : 0}`,
      );
    }
    await this.transport.send(
      connection.platform,
      connection.chatId,
      selected && target
        ? `Напишите ответ для ${(target.message.sender.name ?? 'собеседника').slice(0, 100)} по заявке ${this.requestReference(target.message.conversation)}. Следующее текстовое сообщение отправится в этот чат на сайте. Выбор действует 10 минут. Отмена: /cancel.`
        : 'Не удалось выбрать заявку: чат недоступен или это нажатие уже обработано. Нажмите «Ответить здесь» ещё раз или откройте чат на сайте.',
    );
  }

  private requestReference(conversation: {
    requestId: string | null;
    request?: { number: number | null } | null;
  }) {
    if (!conversation.requestId)
      throw new Error('Direct chats are available on the site only');
    return conversation.request?.number != null
      ? `№ ${conversation.request.number}`
      : `ID ${conversation.requestId.slice(0, 8)}`;
  }

  private notification(
    userId: string,
    delivery: Pick<
      Awaited<ReturnType<MessengerRepository['claimDeliveries']>>[number],
      'id' | 'part' | 'message'
    >,
  ) {
    const { message } = delivery;
    const parts = splitMessage(message.body);
    const suffix =
      parts.length > 1 ? ` · ${delivery.part + 1}/${parts.length}` : '';
    const text = `Заявка ${this.requestReference(message.conversation)}${suffix}\n${(message.sender.name ?? 'Собеседник').slice(0, 100)}:\n\n${parts[delivery.part]}\n\nНажмите «Ответить здесь» или используйте «Ответить» на этом сообщении.`;
    const customer = userId === message.conversation.customerUserId;
    const link = `${this.config.siteUrl}/${customer ? 'profile' : 'pro'}/requests/${message.conversation.requestId}?conversationId=${message.conversationId}`;
    return { text, link, replyPayload: `reply:${delivery.id}` };
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
      const notification = this.notification(connection.userId, delivery);
      const externalMessageId = await this.transport.send(
        connection.platform,
        connection.chatId,
        notification.text,
        notification.link,
        notification.replyPayload,
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

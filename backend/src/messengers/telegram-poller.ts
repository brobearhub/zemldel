import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GrammyError } from 'grammy';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { MessengerConfig } from './messenger-config';
import { MessengerService } from './messenger.service';
import { MessengerApiError } from './messenger-transport';
import { createTelegramApi } from './telegram-api';

class WebhookStillEnabled extends Error {}

/** One polling consumer per bot/database, including overlapping deployments. */
@Injectable()
export class TelegramPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPoller.name);
  private readonly stopped = new AbortController();
  private session?: AbortController;
  private running?: Promise<void>;
  private offset = 0;
  private retryMs = 1000;

  constructor(
    private readonly config: MessengerConfig,
    private readonly service: MessengerService,
  ) {}

  onModuleInit(): void {
    if (
      this.running ||
      this.config.telegramUpdatesMode !== 'polling' ||
      !this.config.workerEnabled
    )
      return;
    if (!this.config.configured('TELEGRAM') || !this.config.listenDatabaseUrl) {
      this.logger.error(
        'Telegram polling не запущен: проверьте настройки бота и PostgreSQL',
      );
      return;
    }
    this.running = this.run();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped.abort();
    this.session?.abort();
    await this.running;
  }

  private async run(): Promise<void> {
    while (!this.stopped.signal.aborted) {
      let pauseMs = 30_000;
      try {
        await this.consume();
      } catch (error) {
        if (this.stopped.signal.aborted) break;
        if (error instanceof WebhookStillEnabled) {
          this.logger.warn(
            'Telegram webhook ещё включён. Выполните npm run messengers:setup с TELEGRAM_UPDATES_MODE=polling',
          );
        } else {
          // Never log SDK errors: they may contain bot tokens and message bodies.
          const status =
            error instanceof GrammyError ? error.error_code : undefined;
          this.logger.warn(
            `Telegram polling: ошибка; повтор запланирован${typeof status === 'number' ? ` (API ${status})` : ''}`,
          );
          pauseMs = this.retryMs;
          const retryAfter =
            error instanceof GrammyError
              ? error.parameters.retry_after
              : error instanceof MessengerApiError
                ? error.retryAfter
                : undefined;
          if (typeof retryAfter === 'number' && Number.isFinite(retryAfter))
            pauseMs = Math.max(
              pauseMs,
              Math.min(retryAfter * 1000, 2_147_483_647),
            );
          this.retryMs = Math.min(this.retryMs * 2, 30_000);
        }
      }
      await delay(pauseMs, undefined, { signal: this.stopped.signal }).catch(
        () => undefined,
      );
    }
  }

  private async consume(): Promise<void> {
    const session = new AbortController();
    this.session = session;
    const client = new Client({
      connectionString: this.config.listenDatabaseUrl,
      application_name: 'zemldel-telegram-poller',
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    // Losing this dedicated session also loses its advisory lock: stop fetching.
    client.on('error', () => session.abort());
    client.on('end', () => session.abort());
    try {
      await client.connect();
      if (session.signal.aborted) return;
      const token = this.config.bot('TELEGRAM').token;
      const lockKey = createHash('sha256')
        .update(`telegram-polling:${token.split(':')[0]}`)
        .digest()
        .readBigInt64BE()
        .toString();
      const lock = await client.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
        [lockKey],
      );
      if (!lock.rows[0]?.acquired || session.signal.aborted) return;

      // Longer than Telegram's 25-second long poll, still bounded and cancellable.
      const api = createTelegramApi(token, 35);
      // grammY's Node typings use abort-controller, but its runtime also accepts
      // native signals (addEventListener/aborted). Keep the adaptation at this boundary.
      const apiSignal = session.signal as unknown as Parameters<
        typeof api.getWebhookInfo
      >[0];
      const webhook = await api.getWebhookInfo(apiSignal);
      if (webhook.url) throw new WebhookStillEnabled();
      this.logger.log('Telegram long polling запущен через IPv4');

      while (!session.signal.aborted && !this.stopped.signal.aborted) {
        // Verify the lock connection before acknowledging the previous batch.
        await client.query('SELECT 1');
        if (session.signal.aborted) return;
        const updates = await api.getUpdates(
          {
            offset: this.offset,
            timeout: 25,
            limit: 25,
            allowed_updates: ['message', 'my_chat_member'],
          },
          apiSignal,
        );
        for (const update of updates) {
          if (session.signal.aborted || this.stopped.signal.aborted) return;
          try {
            await this.service.receive('TELEGRAM', update);
          } catch (error) {
            // A permanently rejected bot reply must not block every user's updates.
            if (
              !(error instanceof MessengerApiError) ||
              ![400, 403].includes(error.status)
            )
              throw error;
            this.logger.warn(
              `Telegram: ответ на событие отклонён (API ${error.status})`,
            );
          }
          // Ack only after processing. Restarts can replay an unacknowledged update;
          // chat clientMessageId and link capture are idempotent for this reason.
          this.offset = update.update_id + 1;
        }
        this.retryMs = 1000;
        // Also bound request frequency if Telegram returns empty batches immediately.
        if (!updates.length)
          await delay(250, undefined, { signal: session.signal });
      }
    } finally {
      session.abort();
      // Closing releases the session-level advisory lock; no schema changes needed.
      await client.end().catch(() => undefined);
      if (this.session === session) this.session = undefined;
    }
  }
}

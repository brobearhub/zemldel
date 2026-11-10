import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessengerConfig } from './messenger-config';
import type { MessengerService } from './messenger.service';
import { TelegramPoller } from './telegram-poller';
import * as telegramApi from './telegram-api';

describe.skipIf(process.env.MESSENGER_DB_TESTS !== '1')(
  'Telegram polling with PostgreSQL',
  () => {
    const pollers: TelegramPoller[] = [];
    let observer: Client | undefined;
    afterEach(async () => {
      await Promise.all(pollers.splice(0).map((p) => p.onModuleDestroy()));
      await observer?.end();
      observer = undefined;
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    it('holds a real session lock during polling and releases it on shutdown', async () => {
      vi.stubEnv('TELEGRAM_UPDATES_MODE', 'polling');
      vi.stubEnv('MESSENGER_WORKER_ENABLED', 'true');
      const config = new MessengerConfig();
      const token = `${randomUUID()}:test-only`;
      vi.spyOn(config, 'configured').mockReturnValue(true);
      vi.spyOn(config, 'bot').mockReturnValue({
        token,
        username: 'test_bot',
        secret: 'test-only',
      });
      vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      const getUpdates = vi.fn(
        (_options: unknown, signal: AbortSignal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true },
            );
          }),
      );
      vi.spyOn(telegramApi, 'createTelegramApi').mockReturnValue({
        getWebhookInfo: vi.fn().mockResolvedValue({ url: '' }),
        getUpdates,
      } as unknown as ReturnType<typeof telegramApi.createTelegramApi>);
      const first = new TelegramPoller(config, {} as MessengerService);
      pollers.push(first);
      first.onModuleInit();
      await vi.waitFor(() => expect(getUpdates).toHaveBeenCalledTimes(1));

      observer = new Client({ connectionString: config.listenDatabaseUrl });
      await observer.connect();
      const key = createHash('sha256')
        .update(`telegram-polling:${token.split(':')[0]}`)
        .digest()
        .readBigInt64BE()
        .toString();
      const tryLock = () =>
        observer!.query<{ acquired: boolean }>(
          'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
          [key],
        );
      expect((await tryLock()).rows[0].acquired).toBe(false);
      await first.onModuleDestroy();
      expect((await tryLock()).rows[0].acquired).toBe(true);
      await observer.query('SELECT pg_advisory_unlock($1::bigint)', [key]);

      const next = new TelegramPoller(config, {} as MessengerService);
      pollers.push(next);
      next.onModuleInit();
      await vi.waitFor(() => expect(getUpdates).toHaveBeenCalledTimes(2));
    });
  },
);

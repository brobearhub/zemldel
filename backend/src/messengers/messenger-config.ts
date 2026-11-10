import { Injectable } from '@nestjs/common';
import type { MessengerPlatform } from '@prisma/client';

@Injectable()
export class MessengerConfig {
  // LISTEN требует постоянного соединения: при transaction-pooling задайте прямой URL.
  readonly listenDatabaseUrl =
    process.env.MESSENGER_LISTEN_DATABASE_URL ?? process.env.DATABASE_URL;
  readonly siteUrl = (process.env.MESSENGER_SITE_URL ?? '').replace(/\/$/, '');
  readonly workerEnabled = process.env.MESSENGER_WORKER_ENABLED === 'true';
  readonly telegramUpdatesMode = this.readTelegramUpdatesMode();

  private readTelegramUpdatesMode(): 'webhook' | 'polling' {
    const mode = process.env.TELEGRAM_UPDATES_MODE ?? 'webhook';
    if (mode !== 'webhook' && mode !== 'polling')
      throw new Error('TELEGRAM_UPDATES_MODE должен быть webhook или polling');
    return mode;
  }

  bot(platform: MessengerPlatform) {
    return {
      token: process.env[`${platform}_BOT_TOKEN`] ?? '',
      username: process.env[`${platform}_BOT_USERNAME`] ?? '',
      secret: process.env[`${platform}_WEBHOOK_SECRET`] ?? '',
    };
  }

  configured(platform: MessengerPlatform): boolean {
    const { token, username, secret } = this.bot(platform);
    return Boolean(
      token &&
      /^[A-Za-z0-9_]+$/.test(username) &&
      /^[A-Za-z0-9_-]{16,256}$/.test(secret) &&
      /^https:\/\//.test(this.siteUrl),
    );
  }
}

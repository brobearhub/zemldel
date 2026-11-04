import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import { MessengerConfig } from './messenger-config';

export const MESSENGER_QUEUE_CHANNEL = 'messenger_queue_ready';

/** Адаптер PostgreSQL LISTEN: соединение ждёт событие без опроса таблиц. */
@Injectable()
export class MessengerQueueSignal {
  private readonly logger = new Logger(MessengerQueueSignal.name);
  private client?: Client;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private onReady?: () => void;
  private retryMs = 1000;

  constructor(private readonly config: MessengerConfig) {}

  start(onReady: () => void): void {
    if (this.onReady) return;
    this.onReady = onReady;
    void this.connect();
  }

  async stop(): Promise<void> {
    this.onReady = undefined;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const client = this.client;
    this.client = undefined;
    await client?.end().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    if (!this.onReady) return;
    const client = new Client({
      connectionString: this.config.listenDatabaseUrl,
      application_name: 'zemldel-messenger-listener',
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    this.client = client;
    const disconnected = () => this.reconnect(client);
    client.on('error', disconnected);
    client.on('end', disconnected);
    client.on('notification', (notification) => {
      if (
        this.client === client &&
        notification.channel === MESSENGER_QUEUE_CHANNEL
      )
        this.onReady?.();
    });
    try {
      await client.connect();
      if (this.client !== client || !this.onReady) return;
      await client.query('LISTEN messenger_queue_ready');
      if (this.client !== client || !this.onReady) return;
      this.retryMs = 1000;
      // После LISTEN проверяем накопленные задания, включая пропущенные при обрыве.
      this.onReady();
    } catch {
      this.reconnect(client);
    }
  }

  private reconnect(client: Client): void {
    if (this.client !== client || !this.onReady) return;
    this.client = undefined;
    void client.end().catch(() => undefined);
    this.logger.warn(
      'Соединение уведомлений очереди потеряно; переподключаемся',
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, this.retryMs);
    this.reconnectTimer.unref();
    this.retryMs = Math.min(this.retryMs * 2, 60_000);
  }
}

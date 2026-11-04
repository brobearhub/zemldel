import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MessengerConfig } from './messenger-config';
import { MessengerQueueSignal } from './messenger-queue-signal';
import { MessengerRepository } from './messenger.repository';
import { MessengerService } from './messenger.service';

@Injectable()
export class MessengerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessengerWorker.name);
  private active = false;
  private running?: Promise<void>;
  private wakeAgain = false;
  private timer?: ReturnType<typeof setTimeout>;
  private failureDelay = 1000;

  constructor(
    private readonly config: MessengerConfig,
    private readonly signal: MessengerQueueSignal,
    private readonly repository: MessengerRepository,
    private readonly service: MessengerService,
  ) {}

  onModuleInit(): void {
    if (!this.config.workerEnabled) return;
    this.active = true;
    this.signal.start(() => this.wake());
  }

  async onModuleDestroy(): Promise<void> {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    await this.signal.stop();
    await this.running;
  }

  private wake(): void {
    if (!this.active) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.running) {
      this.wakeAgain = true;
      return;
    }
    this.schedule(0);
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        this.running = this.run();
      },
      Math.min(Math.max(delay, 0), 2_147_483_647),
    );
    this.timer.unref();
  }

  private async run(): Promise<void> {
    this.wakeAgain = false;
    let nextWake: Date | null = null;
    try {
      await this.service.tick();
      nextWake = await this.repository.nextWakeAt();
      this.failureDelay = 1000;
    } catch {
      this.logger.error('Ошибка обработки очереди; запланирован повтор');
      nextWake = new Date(Date.now() + this.failureDelay);
      this.failureDelay = Math.min(this.failureDelay * 2, 60_000);
    } finally {
      this.running = undefined;
      if (this.active) {
        if (this.wakeAgain) this.schedule(0);
        else if (nextWake) this.schedule(nextWake.getTime() - Date.now());
        // Пустая очередь: ни таймера, ни запросов до следующего NOTIFY.
      }
    }
  }
}

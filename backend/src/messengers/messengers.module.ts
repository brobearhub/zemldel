import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { MessengerConfig } from './messenger-config';
import { MessengerController } from './messenger.controller';
import { MessengerRepository } from './messenger.repository';
import { MessengerService } from './messenger.service';
import { MessengerTransport } from './messenger-transport';
import { MessengerQueueSignal } from './messenger-queue-signal';
import { MessengerWorker } from './messenger-worker';

@Module({
  imports: [AuthModule, ChatModule],
  controllers: [MessengerController],
  providers: [
    MessengerConfig,
    MessengerRepository,
    MessengerService,
    MessengerTransport,
    MessengerQueueSignal,
    MessengerWorker,
  ],
})
export class MessengersModule {}

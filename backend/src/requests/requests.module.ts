import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { LegalDocsModule } from '../legal-docs/legal-docs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestsController } from './requests.controller';
import { ProviderWorkService } from './provider-work.service';
import { ProviderWorkController } from './provider-work.controller';
import { RequestsService } from './requests.service';
import { RequestAssignmentsService } from './request-assignments.service';
import { RequestAssignmentsController } from './request-assignments.controller';
import {
  REQUEST_FEED_THROTTLE_OPTIONS,
  RequestFeedThrottlerGuard,
} from './request-feed-throttler.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LegalDocsModule,
    ChatModule,
    ThrottlerModule.forRoot(REQUEST_FEED_THROTTLE_OPTIONS),
  ],
  controllers: [
    RequestsController,
    RequestAssignmentsController,
    ProviderWorkController,
  ],
  providers: [
    RequestsService,
    ProviderWorkService,
    RequestAssignmentsService,
    RequestFeedThrottlerGuard,
  ],
  exports: [RequestsService],
})
export class RequestsModule {}

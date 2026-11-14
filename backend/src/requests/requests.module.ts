import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { LegalDocsModule } from '../legal-docs/legal-docs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { RequestAssignmentsService } from './request-assignments.service';
import { RequestAssignmentsController } from './request-assignments.controller';

@Module({
  imports: [PrismaModule, AuthModule, LegalDocsModule, ChatModule],
  controllers: [RequestsController, RequestAssignmentsController],
  providers: [RequestsService, RequestAssignmentsService],
  exports: [RequestsService],
})
export class RequestsModule {}

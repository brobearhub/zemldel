import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { RequestDocumentRequestsController } from './request-document-requests.controller';
import { RequestDocumentRequestsService } from './request-document-requests.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [RequestDocumentRequestsController],
  providers: [RequestDocumentRequestsService],
})
export class RequestDocumentRequestsModule {}


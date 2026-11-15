import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ProviderDocumentsService } from './provider-documents.service';
import { ProviderDocumentsController } from './provider-documents.controller';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ProviderDocumentsController],
  providers: [ProviderDocumentsService],
  exports: [ProviderDocumentsService],
})
export class ProviderDocumentsModule {}

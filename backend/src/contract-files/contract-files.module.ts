import { ProviderDocumentsModule } from '../provider-documents/provider-documents.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ContractFilesController } from './contract-files.controller';
import { ContractFilesService } from './contract-files.service';

@Module({
  imports: [AuthModule, StorageModule, ProviderDocumentsModule],
  controllers: [ContractFilesController],
  providers: [ContractFilesService],
})
export class ContractFilesModule {}

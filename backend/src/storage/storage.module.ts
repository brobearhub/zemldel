import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { PassportStorageService } from './passport-storage.service';
import { DocumentStorageService } from './document-storage.service';

@Module({
  providers: [S3Service, PassportStorageService, DocumentStorageService],
  exports: [S3Service, PassportStorageService, DocumentStorageService],
})
export class StorageModule {}

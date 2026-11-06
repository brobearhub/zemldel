import { PassportAccessController } from './passport-access.controller';
import { PassportAccessService } from './passport-access.service';
import { PassportProviderPhotosController } from './passport-provider-photos.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsController } from './documents.controller';
import { DocumentsCryptoService } from './documents-crypto.service';
import { DocumentsService } from './documents.service';
import { StorageModule } from '../storage/storage.module';
import { PassportFormStorageService } from './passport-form-storage.service';
import { PassportStorageCleanupService } from './passport-storage-cleanup.service';
import { PassportPhotosController } from './passport-photos.controller';
import { PassportPhotosService } from './passport-photos.service';
import { PassportPhotoStorageService } from './passport-photo-storage.service';
import { PrivateDocumentMonitoringService } from '../storage/private-document-monitoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, StorageModule, PrismaModule],
  controllers: [
    DocumentsController,
    PassportPhotosController,
    PassportAccessController,
    PassportProviderPhotosController,
  ],
  providers: [
    DocumentsService,
    PassportAccessService,
    DocumentsCryptoService,
    PassportFormStorageService,
    PassportStorageCleanupService,
    PassportPhotosService,
    PassportPhotoStorageService,
    PrivateDocumentMonitoringService,
  ],
})
export class DocumentsModule {}

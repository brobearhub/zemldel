import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ProviderVerificationAdminController } from './provider-verification-admin.controller';
import { ProviderVerificationAdminService } from './provider-verification-admin.service';
import { ProvidersController } from './providers.controller';
import { ProviderVerificationService } from './provider-verification.service';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ProvidersController, ProviderVerificationAdminController],
  providers: [
    ProvidersService,
    ProviderVerificationService,
    ProviderVerificationAdminService,
  ],
})
export class ProvidersModule {}

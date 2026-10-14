import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ProvidersController } from './providers.controller';
import { ProviderVerificationService } from './provider-verification.service';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderVerificationService],
})
export class ProvidersModule {}

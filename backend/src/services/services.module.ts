import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}

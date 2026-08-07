import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { RequestWorkStagesController } from './request-work-stages.controller';
import { RequestWorkStagesService } from './request-work-stages.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [RequestWorkStagesController],
  providers: [RequestWorkStagesService],
})
export class RequestWorkStagesModule {}

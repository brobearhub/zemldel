import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}

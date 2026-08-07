import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RequestWorkStagesController } from './request-work-stages.controller';
import { RequestWorkStagesService } from './request-work-stages.service';

@Module({
  imports: [AuthModule],
  controllers: [RequestWorkStagesController],
  providers: [RequestWorkStagesService],
})
export class RequestWorkStagesModule {}

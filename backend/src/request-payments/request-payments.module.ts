import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RequestPaymentsController } from './request-payments.controller';
import { RequestPaymentsService } from './request-payments.service';

@Module({
  imports: [AuthModule],
  controllers: [RequestPaymentsController],
  providers: [RequestPaymentsService],
})
export class RequestPaymentsModule {}

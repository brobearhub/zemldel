import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ServiceTemplatesController } from './service-templates.controller';
import { ServiceTemplatesService } from './service-templates.service';

@Module({
  imports: [AuthModule],
  controllers: [ServiceTemplatesController],
  providers: [ServiceTemplatesService],
})
export class ServiceTemplatesModule {}


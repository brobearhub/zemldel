import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LegalDocsModule } from '../legal-docs/legal-docs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [PrismaModule, AuthModule, LegalDocsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}

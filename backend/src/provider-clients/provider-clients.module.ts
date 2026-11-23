import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ClientInvitationsController,
  ProviderClientsController,
} from './provider-clients.controller';
import { ProviderClientsService } from './provider-clients.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProviderClientsController, ClientInvitationsController],
  providers: [ProviderClientsService],
})
export class ProviderClientsModule {}

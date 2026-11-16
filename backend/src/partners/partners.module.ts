import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { PartnerDelegationService } from './partner-delegation.service';

@Module({
  imports: [AuthModule, ChatModule, PrismaModule],
  controllers: [PartnersController],
  providers: [PartnersService, PartnerDelegationService],
})
export class PartnersModule {}

import { PlanModule } from '../billing/plan.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { SocketJwtService } from './socket-jwt.service';

@Module({
  imports: [PlanModule, PrismaModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, SocketJwtService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}

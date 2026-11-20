import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { StorageModule } from '../storage/storage.module';
import { PlanModule } from '../billing/plan.module';
import { ChatModule } from '../chat/chat.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { LandsService } from './lands.service';
import { LandsController } from './lands.controller';
import { LandMediaService } from './land-media.service';
@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ServicesModule,
    StorageModule,
    PlanModule,
    ChatModule,
    GeocodingModule,
  ],
  controllers: [LandsController],
  providers: [LandsService, LandMediaService],
})
export class LandsModule {}

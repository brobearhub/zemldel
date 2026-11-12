import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanModule } from '../billing/plan.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
@Module({
  imports: [AuthModule, PlanModule, PrismaModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}

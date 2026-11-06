import { ServicesModule } from '../services/services.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';

@Module({
  imports: [ServicesModule, PrismaModule, AuthModule],
  controllers: [ServiceCategoriesController],
  providers: [ServiceCategoriesService],
})
export class ServiceCategoriesModule {}

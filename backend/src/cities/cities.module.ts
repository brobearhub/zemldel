import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CitiesAdminController } from './cities-admin.controller';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CitiesController, CitiesAdminController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}

import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanService } from './plan.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}

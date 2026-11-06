import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { PlanModule } from './plan.module';
import { BillingRenewalService } from './billing-renewal.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { TbankClient } from './tbank';

@Module({
  imports: [AuthModule, PlanModule],
  controllers: [BillingController, WorkspaceController],
  providers: [
    BillingService,
    TbankClient,
    BillingRenewalService,
    WorkspaceService,
  ],
})
export class BillingModule {}

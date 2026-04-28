import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { AuthService } from '../auth/auth.service';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly internalAuth: InternalAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post('requests/mine/:id/pay')
  async customerPay(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuth.getUserIdFromRequest(request);
    return this.payments.initiateCustomerPayment(userId, id);
  }

  @Post('pro/requests/:id/payout')
  async providerPayout(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuth.getUserIdFromRequest(request);
    const context = await this.authService.getOrderManagementContext(
      userId,
      'read',
    );
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.payments.initiateProviderPayout(context.providerId, id);
  }

  @Get('payments/:id')
  async getPayment(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuth.getUserIdFromRequest(request);
    return this.payments.getPaymentByIdForUser(userId, id);
  }

  @Post('payments/webhook/:providerKey')
  async webhook(
    @Param('providerKey') providerKey: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    return this.payments.handleWebhook(providerKey, headers, body);
  }
}

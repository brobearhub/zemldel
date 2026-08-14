import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import {
  CreateRequestPaymentDto,
  RequestFinanceDto,
  SetRequestTotalDto,
} from './dto/request-payments.dto';
import { RequestPaymentsService } from './request-payments.service';

@ApiStandardErrors()
@ApiTags('request-payments')
@Controller()
export class RequestPaymentsController {
  constructor(
    private readonly payments: RequestPaymentsService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  private getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  @Get('pro/requests/:requestId/payments')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  getForProvider(@Req() request: Request, @Param('requestId') requestId: string) {
    return this.payments.getForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
    });
  }

  @Patch('pro/requests/:requestId/finance')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  setTotalForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: SetRequestTotalDto,
  ) {
    return this.payments.setTotalForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      totalAmountKopecks: body.totalAmountKopecks,
    });
  }

  @Post('pro/requests/:requestId/payments')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  addPaymentForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateRequestPaymentDto,
  ) {
    return this.payments.addPaymentForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      amountKopecks: body.amountKopecks,
      comment: body.comment,
      type: body.type,
      paidAt: body.paidAt,
    });
  }

  @Post('pro/requests/:requestId/payments/:paymentId/paid')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'paymentId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  markPaymentPaidForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.payments.markPaymentPaidForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      paymentId,
    });
  }

  @Get('requests/mine/:requestId/payments')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  getForCustomer(@Req() request: Request, @Param('requestId') requestId: string) {
    return this.payments.getForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
    });
  }

  @Post('requests/mine/:requestId/payments/:paymentId/paid')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'paymentId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  markPaymentPaidForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.payments.markPaymentPaidForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      paymentId,
    });
  }
}

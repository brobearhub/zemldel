import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import {
  CreateRequestPriceProposalDto,
  CreateRequestPaymentDto,
  RequestFinanceDto,
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
  getForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    return this.payments.getForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
    });
  }

  @Post('pro/requests/:requestId/price-proposals')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  proposePriceForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateRequestPriceProposalDto,
  ) {
    return this.payments.proposePriceForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      amountRubles: body.amountRubles,
    });
  }

  @Post('pro/requests/:requestId/price-proposals/:proposalId/accept')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'proposalId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  acceptPriceForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.payments.acceptPriceForProvider({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      proposalId,
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
      amountRubles: body.amountRubles,
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
  getForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    return this.payments.getForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
    });
  }

  @Post('requests/mine/:requestId/price-proposals')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  proposePriceForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateRequestPriceProposalDto,
  ) {
    return this.payments.proposePriceForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      amountRubles: body.amountRubles,
    });
  }

  @Post('requests/mine/:requestId/price-proposals/:proposalId/accept')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'proposalId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  acceptPriceForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.payments.acceptPriceForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      proposalId,
    });
  }

  @Post('requests/mine/:requestId/payments')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestFinanceDto })
  addPaymentForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateRequestPaymentDto,
  ) {
    return this.payments.addPaymentForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      amountRubles: body.amountRubles,
      comment: body.comment,
      type: body.type,
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

import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiForbiddenErrorDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import {
  CreateRequestPriceProposalDto,
  CreateRequestPaymentDto,
  RequestFinanceDto,
  RequestFinanceContextDto,
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
  @ApiOperation({
    summary: 'Установить стоимость работ',
    description:
      'Исполнитель устанавливает или изменяет стоимость работ. Цена применяется сразу, подтверждение клиентом не требуется.',
  })
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
  @ApiOperation({
    summary: 'Устаревшее подтверждение цены исполнителем',
    description:
      'Подтверждение цены больше не требуется. Метод возвращает 403.',
    deprecated: true,
  })
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'proposalId', type: String })
  @ApiForbiddenResponse({
    type: ApiForbiddenErrorDto,
    description: 'Подтверждение цены больше не поддерживается.',
  })
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
      operationId: body.operationId,
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
    @Query() query: RequestFinanceContextDto,
  ) {
    return this.payments.getForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      conversationId: query.conversationId,
    });
  }

  @Post('requests/mine/:requestId/price-proposals')
  @ApiOperation({
    summary: 'Устаревшее предложение цены клиентом',
    description:
      'Клиент не может менять стоимость работ. Метод возвращает 403.',
    deprecated: true,
  })
  @ApiParam({ name: 'requestId', type: String })
  @ApiForbiddenResponse({
    type: ApiForbiddenErrorDto,
    description: 'Только исполнитель может изменить стоимость работ.',
  })
  proposePriceForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateRequestPriceProposalDto,
  ) {
    return this.payments.proposePriceForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      amountRubles: body.amountRubles,
      conversationId: body.conversationId,
    });
  }

  @Post('requests/mine/:requestId/price-proposals/:proposalId/accept')
  @ApiOperation({
    summary: 'Устаревшее подтверждение цены клиентом',
    description:
      'Подтверждение цены больше не требуется. Метод возвращает 403.',
    deprecated: true,
  })
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'proposalId', type: String })
  @ApiForbiddenResponse({
    type: ApiForbiddenErrorDto,
    description: 'Подтверждение цены больше не поддерживается.',
  })
  acceptPriceForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('proposalId') proposalId: string,
    @Query() query: RequestFinanceContextDto,
  ) {
    return this.payments.acceptPriceForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      proposalId,
      conversationId: query.conversationId,
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
      operationId: body.operationId,
      conversationId: body.conversationId,
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
    @Query() query: RequestFinanceContextDto,
  ) {
    return this.payments.markPaymentPaidForCustomer({
      actorUserId: this.getRequiredActorUserId(request),
      requestId,
      paymentId,
      conversationId: query.conversationId,
    });
  }
}

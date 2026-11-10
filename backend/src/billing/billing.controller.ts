import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsIn,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Matches,
  MaxLength,
} from 'class-validator';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { BillingService } from './billing.service';
import { BILLING_PRODUCTS, PLAN_PRODUCTS } from './billing-catalog';
import type { BillingProduct } from './billing-catalog';

class CheckoutDto {
  @IsOptional() @IsInt() @Min(1) expectedRenewalAmount?: number;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) acceptedOfferVersion!: string;
  @IsOptional() @IsBoolean() autoRenew?: boolean;
  @IsOptional() @IsString() quoteAt?: string;
  @IsOptional() @IsInt() @Min(1) expectedAmount?: number;
  @IsIn(Object.keys(BILLING_PRODUCTS))
  product!: BillingProduct;

  @IsUUID('4')
  operationId!: string;
}

class SettingsDto {
  @IsOptional() @IsString() acceptedOfferVersion?: string;
  @IsOptional() @IsInt() @Min(1) expectedRenewalAmount?: number;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsBoolean() autoRenew?: boolean;
  @IsOptional() @IsIn(['MONTH', 'YEAR', null]) nextBillingPeriod?:
    | 'MONTH'
    | 'YEAR'
    | null;
  @IsOptional() @IsIn(['STANDARD', 'LITE', 'BUSINESS', null]) nextPlan?:
    | string
    | null;
}
class QuoteDto {
  @IsIn(Object.keys(BILLING_PRODUCTS)) product!: BillingProduct;
}
class SlugQuoteDto {
  @IsString() @MaxLength(64) slug!: string;
}
class SlugCheckoutDto extends SlugQuoteDto {
  @IsUUID('4') operationId!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) acceptedOfferVersion!: string;
  @IsInt() @Min(1) expectedAmount!: number;
}
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get('catalog')
  @Header('Cache-Control', 'no-store')
  catalog() {
    return PLAN_PRODUCTS;
  }

  @Get('providers/:providerId')
  overview(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.billing.overview(
      this.auth.getUserIdFromRequest(request),
      providerId,
    );
  }

  @Post('providers/:providerId/checkout')
  checkout(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: CheckoutDto,
  ) {
    return this.billing.checkout(
      this.auth.getUserIdFromRequest(request),
      providerId,
      body.product,
      body.operationId,
      body.autoRenew,
      body.quoteAt,
      body.expectedAmount,
      body.acceptedOfferVersion,
      body.expectedRenewalAmount,
    );
  }

  @Post('providers/:providerId/orders/:orderId/refresh')
  refresh(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.billing.refresh(
      this.auth.getUserIdFromRequest(request),
      providerId,
      orderId,
    );
  }

  @Post('providers/:providerId/settings')
  settings(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: SettingsDto,
  ) {
    return this.billing.settings(
      this.auth.getUserIdFromRequest(request),
      providerId,
      body,
    );
  }
  @Post('providers/:providerId/quote')
  quote(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: QuoteDto,
  ) {
    return this.billing.quote(
      this.auth.getUserIdFromRequest(request),
      providerId,
      body.product,
    );
  }

  @Get('providers/:providerId/slug-change')
  slugStatus(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    return this.billing.slugChangeStatus(
      this.auth.getUserIdFromRequest(request),
      providerId,
    );
  }

  @Post('providers/:providerId/slug-quote')
  slugQuote(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: SlugQuoteDto,
  ) {
    return this.billing.slugQuote(
      this.auth.getUserIdFromRequest(request),
      providerId,
      body.slug,
    );
  }

  @Post('providers/:providerId/slug-checkout')
  slugCheckout(
    @Req() request: Request,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: SlugCheckoutDto,
  ) {
    return this.billing.checkoutSlugChange(
      this.auth.getUserIdFromRequest(request),
      providerId,
      body,
    );
  }

  @Post('tbank/notification')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  notification(@Body() body: Record<string, unknown>) {
    return this.billing.notification(body);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { GeocodingService } from './geocoding.service';

@ApiTags('geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly auth: InternalAuthService,
  ) {}

  @Post('address-suggestions')
  @HttpCode(HttpStatus.OK)
  suggest(@Req() req: Request, @Body('query') query: unknown) {
    this.auth.getUserIdFromRequest(req);
    return this.geocoding.suggestAddresses(query);
  }

  @Post('resolve-address')
  @HttpCode(HttpStatus.OK)
  async resolve(@Req() req: Request, @Body('reference') reference: unknown) {
    this.auth.getUserIdFromRequest(req);
    return { point: await this.geocoding.resolveAddress(reference) };
  }

  @Get('city-center')
  async cityCenter(
    @Req() req: Request,
    @Query('cityId', ParseUUIDPipe) cityId: string,
  ) {
    this.auth.getUserIdFromRequest(req);
    return { point: await this.geocoding.findCityCenter(cityId) };
  }

  @Post('cadastral-location')
  @HttpCode(HttpStatus.OK)
  cadastralLocation(
    @Req() req: Request,
    @Body('cadastralNumber') number: unknown,
  ) {
    this.auth.getUserIdFromRequest(req);
    return this.geocoding.findCadastralLocation(number);
  }
}

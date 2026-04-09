import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { AddProviderManagerDto } from './dto/add-provider-manager.dto';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Post()
  createProvider(@Req() request: Request, @Body() body: CreateProviderDto) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.createProvider(userId, body);
  }

  @Get('mine')
  getMyProviders(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.getMyProviders(userId);
  }

  @Post(':providerId/activate')
  activateProvider(
    @Req() request: Request,
    @Param('providerId') providerId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.activateProvider(userId, providerId);
  }

  @Get(':providerId/members')
  getProviderMembers(
    @Req() request: Request,
    @Param('providerId') providerId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.getProviderMembers(userId, providerId);
  }

  @Post(':providerId/members')
  addProviderManager(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: AddProviderManagerDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.addProviderManager(userId, providerId, body);
  }

  @Patch(':providerId/city')
  updateProviderCity(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: unknown,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const payload = body as { cityId?: string | null } | null;
    return this.providersService.updateProviderCity(userId, providerId, {
      cityId: payload?.cityId,
    });
  }
}

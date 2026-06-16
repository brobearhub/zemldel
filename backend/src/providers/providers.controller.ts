import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { AddProviderManagerDto } from './dto/add-provider-manager.dto';
import {
  ProviderActivateResponseDto,
  ProviderCityUpdateResponseDto,
  ProviderMemberDto,
  ProviderMembersResponseDto,
  ProviderMembershipListItemDto,
  ProviderSlugCheckDto,
  ProviderSlugUpdateResponseDto,
} from './dto/provider-responses.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('providers')
@ApiStandardErrors()
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        provider: { $ref: '#/components/schemas/ProviderDto' },
        authContext: { $ref: '#/components/schemas/AuthorizedUserDto' },
      },
      required: ['provider', 'authContext'],
    },
  })
  createProvider(@Req() request: Request, @Body() body: CreateProviderDto) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.createProvider(userId, body);
  }

  @Get('slug-check')
  @ApiQuery({ name: 'slug', required: true, type: String })
  @ApiOkResponse({ type: ProviderSlugCheckDto })
  checkSlugAvailability(@Query('slug') slug: string) {
    return this.providersService.checkSlugAvailability(slug ?? '');
  }

  @Get('mine')
  @ApiOkResponse({ type: [ProviderMembershipListItemDto] })
  getMyProviders(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.getMyProviders(userId);
  }

  @Post(':providerId/activate')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: ProviderActivateResponseDto })
  activateProvider(
    @Req() request: Request,
    @Param('providerId') providerId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.activateProvider(userId, providerId);
  }

  @Get(':providerId/members')
  @ApiParam({ name: 'providerId', type: String })
  @ApiOkResponse({ type: ProviderMembersResponseDto })
  getProviderMembers(
    @Req() request: Request,
    @Param('providerId') providerId: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.getProviderMembers(userId, providerId);
  }

  @Post(':providerId/members')
  @ApiParam({ name: 'providerId', type: String })
  @ApiCreatedResponse({ type: ProviderMemberDto })
  addProviderManager(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: AddProviderManagerDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.addProviderManager(userId, providerId, body);
  }

  @Patch(':providerId/slug')
  @ApiParam({ name: 'providerId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  })
  @ApiOkResponse({ type: ProviderSlugUpdateResponseDto })
  updateProviderSlug(
    @Req() request: Request,
    @Param('providerId') providerId: string,
    @Body() body: { slug: string },
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.providersService.updateProviderSlug(
      userId,
      providerId,
      body.slug ?? '',
    );
  }

  @Patch(':providerId/city')
  @ApiParam({ name: 'providerId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { cityId: { type: 'string', format: 'uuid', nullable: true } },
    },
  })
  @ApiOkResponse({ type: ProviderCityUpdateResponseDto })
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

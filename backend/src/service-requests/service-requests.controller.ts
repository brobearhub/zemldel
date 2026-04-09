import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { parseServiceRequestServiceCreateDto, parseServiceRequestTemplateCreateDto, parseServiceRequestUnlinkedCreateDto } from './dto/service-request.dto';
import { ServiceRequestsService } from './service-requests.service';

@Controller()
export class ServiceRequestsController {
  constructor(
    private readonly requests: ServiceRequestsService,
    private readonly authService: AuthService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  private getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  private getOptionalActorUserId(request: Request) {
    return this.internalAuth.getOptionalUserIdFromRequest(request);
  }

  private async requireProviderContext(request: Request) {
    const userId = this.internalAuth.getUserIdFromRequest(request);
    const ctx = await this.authService.getServiceManagementContext(userId, 'read');
    if (ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!ctx.providerId) {
      throw new NotFoundException('Active provider is required');
    }
    return { ...ctx, providerId: ctx.providerId };
  }

  @Post('service-requests')
  async createUnlinked(@Req() request: Request, @Body() body: unknown) {
    const userId = this.getRequiredActorUserId(request);
    const { data, issues } = parseServiceRequestUnlinkedCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({ error: 'Validation failed', issues });
    }
    return this.requests.createUnlinked(userId, data);
  }

  @Post('service-templates/:id/requests')
  async createFromTemplate(@Req() request: Request, @Param('id') templateId: string, @Body() body: unknown) {
    const userId = this.getRequiredActorUserId(request);
    const { data, issues } = parseServiceRequestTemplateCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({ error: 'Validation failed', issues });
    }
    return this.requests.createForTemplate(templateId, userId, data);
  }

  @Post('services/:id/requests')
  async createFromService(@Req() request: Request, @Param('id') serviceId: string, @Body() body: unknown) {
    const actorUserId = this.getOptionalActorUserId(request);
    const { data, issues } = parseServiceRequestServiceCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({ error: 'Validation failed', issues });
    }
    return this.requests.createForService(serviceId, actorUserId ?? null, data);
  }

  @Get('service-requests/mine')
  async listMine(@Req() request: Request) {
    const userId = this.getRequiredActorUserId(request);
    return this.requests.listMine(userId);
  }

  @Get('pro/service-requests/feed')
  async proFeed(@Req() request: Request) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.listProFeed(ctx.providerId);
  }

  @Get('pro/service-requests/:id')
  async proById(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.getProById(ctx.providerId, id);
  }

  @Post('pro/service-requests/:id/take')
  async take(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.take(ctx.providerId, id);
  }

  @Post('pro/service-requests/:id/convert-to-order')
  async convertToOrder(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.convertToOrder(ctx.providerId, id);
  }
}


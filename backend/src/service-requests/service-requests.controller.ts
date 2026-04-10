import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import {
  parseServiceRequestCategoryCreateDto,
  parseServiceRequestServiceCreateDto,
  parseServiceRequestUnlinkedCreateDto,
} from './dto/service-request.dto';
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
    const ctx = await this.authService.getServiceManagementContext(
      userId,
      'read',
    );
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
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.requests.createUnlinked(userId, data);
  }

  @Post('service-categories/:id/requests')
  async createFromCategory(
    @Req() request: Request,
    @Param('id') categoryId: string,
    @Body() body: unknown,
  ) {
    const userId = this.getRequiredActorUserId(request);
    const { data, issues } = parseServiceRequestCategoryCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.requests.createForCategory(categoryId, userId, data);
  }

  @Post('services/:id/requests')
  async createFromService(
    @Req() request: Request,
    @Param('id') serviceId: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getOptionalActorUserId(request);
    const { data, issues } = parseServiceRequestServiceCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.requests.createForService(serviceId, actorUserId ?? null, data);
  }

  @Get('service-requests/mine')
  async listMine(@Req() request: Request) {
    const userId = this.getRequiredActorUserId(request);
    return this.requests.listMine(userId);
  }

  @Get('service-requests/mine/:id')
  async mineById(@Req() request: Request, @Param('id') id: string) {
    const userId = this.getRequiredActorUserId(request);
    return this.requests.getMineById(userId, id);
  }

  @Post('service-requests/mine/:id/initiate-order')
  async customerInitiateOrder(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.getRequiredActorUserId(request);
    const payload = body as { conversationId?: unknown } | null | undefined;
    const conversationId =
      payload && typeof payload === 'object' && typeof payload.conversationId === 'string'
        ? payload.conversationId
        : null;
    if (!conversationId) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['conversationId'],
            message: 'conversationId is required',
          },
        ],
      });
    }
    return this.requests.initiateOrderByCustomer(userId, id, { conversationId });
  }

  @Post('service-requests/mine/:id/confirm-order')
  async customerConfirmOrder(@Req() request: Request, @Param('id') id: string) {
    const userId = this.getRequiredActorUserId(request);
    return this.requests.confirmOrderByCustomer(userId, id);
  }

  @Get('pro/service-requests/feed')
  async proFeed(@Req() request: Request) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.listProFeed(ctx.providerId);
  }

  @Get('pro/service-requests/inbox')
  async proInbox(
    @Req() request: Request,
    @Query() query: { status?: string; categoryId?: string },
  ) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.listProInbox(ctx.providerId, {
      status:
        query.status === 'DISCUSSING'
          ? 'DISCUSSING'
          : query.status === 'NEW' || query.status === undefined
            ? 'NEW'
            : (query.status as any),
      categoryId: query.categoryId ?? undefined,
    });
  }

  @Get('pro/service-requests/eligible-categories')
  async eligibleCategories(@Req() request: Request) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.listProEligibleCategories(ctx.providerId);
  }

  @Get('pro/inbox-settings')
  async getInboxSettings(@Req() request: Request) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.getProInboxSettings(ctx.actorUserId, ctx.providerId);
  }

  @Put('pro/inbox-settings')
  async setInboxSettings(@Req() request: Request, @Body() body: unknown) {
    const ctx = await this.requireProviderContext(request);
    const payload = body as
      | { status?: unknown; categoryId?: unknown }
      | null
      | undefined;

    const status =
      payload?.status === 'DISCUSSING'
        ? 'DISCUSSING'
        : payload?.status === 'NEW' || payload?.status === undefined
          ? 'NEW'
          : (payload?.status as any);

    const categoryId =
      payload?.categoryId === null || payload?.categoryId === undefined
        ? payload?.categoryId
        : typeof payload?.categoryId === 'string'
          ? payload?.categoryId
          : (payload?.categoryId as any);

    return this.requests.setProInboxSettings(ctx.actorUserId, ctx.providerId, {
      status,
      categoryId,
    });
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

  @Post('pro/service-requests/:id/initiate-order')
  async proInitiateOrder(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.initiateOrderByProvider(ctx.providerId, id);
  }

  @Post('pro/service-requests/:id/confirm-order')
  async proConfirmOrder(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.confirmOrderByProvider(ctx.providerId, id);
  }
}

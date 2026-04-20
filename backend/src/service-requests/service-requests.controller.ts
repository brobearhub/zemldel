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

  // Legacy pay-advance endpoint removed.

  @Post('service-requests/mine/:id/accept-terms')
  async customerAcceptTerms(@Req() request: Request, @Param('id') id: string) {
    const userId = this.getRequiredActorUserId(request);
    return this.requests.acceptTermsByCustomer(userId, id);
  }

  @Post('service-requests/mine/:id/select-provider')
  async customerSelectProvider(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.getRequiredActorUserId(request);
    const payload = body as { providerId?: unknown } | null | undefined;
    const providerId =
      payload && typeof payload === 'object' && typeof payload.providerId === 'string'
        ? payload.providerId
        : null;
    if (!providerId) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['providerId'],
            message: 'providerId is required',
          },
        ],
      });
    }
    return this.requests.selectProviderByCustomer(userId, id, { providerId });
  }

  @Post('service-requests/mine/:id/accept-contract')
  async customerAcceptContract(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.getRequiredActorUserId(request);
    const payload = body as { offerVersion?: unknown } | null | undefined;
    const offerVersion =
      payload && typeof payload === 'object' && typeof payload.offerVersion === 'string'
        ? payload.offerVersion
        : null;
    if (!offerVersion) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['offerVersion'],
            message: 'offerVersion is required',
          },
        ],
      });
    }
    return this.requests.acceptContractByCustomer(userId, id, { offerVersion });
  }

  @Post('service-requests/mine/:id/pay')
  async customerPay(@Req() request: Request, @Param('id') id: string) {
    const userId = this.getRequiredActorUserId(request);
    return this.requests.payByCustomer(userId, id);
  }

  @Get('pro/service-requests/feed')
  async proFeed(@Req() request: Request) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.listProFeed(ctx.providerId);
  }

  @Get('pro/service-requests/inbox')
  async proInbox(
    @Req() request: Request,
    @Query()
    query: { status?: string; categoryId?: string; dialogScope?: string },
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
      dialogScope: query.dialogScope === 'ARCHIVE' ? 'ARCHIVE' : 'ACTIVE',
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
      | { status?: unknown; categoryId?: unknown; dialogScope?: unknown }
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

    const dialogScope =
      payload?.dialogScope === 'ARCHIVE'
        ? 'ARCHIVE'
        : payload?.dialogScope === 'ACTIVE' || payload?.dialogScope === undefined
          ? 'ACTIVE'
          : (payload?.dialogScope as any);

    return this.requests.setProInboxSettings(ctx.actorUserId, ctx.providerId, {
      status,
      categoryId,
      dialogScope,
    });
  }

  @Get('pro/service-requests/:id')
  async proById(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.getProById(ctx.providerId, id);
  }

  // Legacy take/convert/confirm/propose-advance endpoints removed.

  @Post('pro/service-requests/:id/set-terms')
  async proSetTerms(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const ctx = await this.requireProviderContext(request);
    const payload = body as { dealTerms?: unknown } | null | undefined;
    const dealTerms =
      payload && typeof payload === 'object' && payload.dealTerms !== undefined
        ? payload.dealTerms
        : null;
    if (!dealTerms || typeof dealTerms !== 'object') {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['dealTerms'],
            message: 'dealTerms is required',
          },
        ],
      });
    }
    return this.requests.setTermsByProvider(ctx.providerId, id, {
      dealTerms: dealTerms as any,
    });
  }

  @Post('pro/service-requests/:id/decline-offer')
  async proDeclineOffer(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requireProviderContext(request);
    return this.requests.declineOfferByProvider(ctx.providerId, id);
  }
}

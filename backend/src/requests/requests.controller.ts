import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  parseRequestCategoryCreateDto,
  parseRequestServiceCreateDto,
  parseRequestUnlinkedCreateDto,
} from './dto/request.dto';
import { RequestsService } from './requests.service';

@Controller()
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  // --- Customer: create ---

  @Post('requests')
  async createUnlinked(@Req() request: Request, @Body() body: unknown) {
    const userId = this.requests.getRequiredActorUserId(request);
    const { data, issues } = parseRequestUnlinkedCreateDto(body);
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
    const userId = this.requests.getRequiredActorUserId(request);
    const { data, issues } = parseRequestCategoryCreateDto(body);
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
    const actorUserId = this.requests.getOptionalActorUserId(request);
    const { data, issues } = parseRequestServiceCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.requests.createForService(serviceId, actorUserId ?? null, data);
  }

  // --- Customer: read ---

  @Get('requests/mine')
  async listMine(@Req() request: Request) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.listMine(userId);
  }

  @Get('requests/mine/:id')
  async mineById(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.getMineById(userId, id);
  }

  // --- Customer: pre-order actions ---

  @Post('requests/mine/:id/initiate-order')
  async customerInitiateOrder(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    const payload = body as { conversationId?: unknown } | null | undefined;
    const conversationId =
      payload &&
      typeof payload === 'object' &&
      typeof payload.conversationId === 'string'
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
    return this.requests.initiateOrderByCustomer(userId, id, {
      conversationId,
    });
  }

  @Post('requests/mine/:id/accept-terms')
  async customerAcceptTerms(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.acceptTermsByCustomer(userId, id);
  }

  @Post('requests/mine/:id/select-provider')
  async customerSelectProvider(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    const payload = body as { providerId?: unknown } | null | undefined;
    const providerId =
      payload &&
      typeof payload === 'object' &&
      typeof payload.providerId === 'string'
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

  @Post('requests/mine/:id/accept-contract')
  async customerAcceptContract(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    const payload = body as { offerVersion?: unknown } | null | undefined;
    const offerVersion =
      payload &&
      typeof payload === 'object' &&
      typeof payload.offerVersion === 'string'
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

  // --- Customer: order-phase actions ---

  @Post('requests/mine/:id/accept-result')
  async acceptResult(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.acceptResultByCustomer(userId, id);
  }

  @Post('requests/mine/:id/send-remarks')
  async sendRemarks(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    const payload = body as { remarks?: unknown } | null | undefined;
    const remarks =
      payload &&
      typeof payload === 'object' &&
      typeof payload.remarks === 'string'
        ? payload.remarks
        : null;
    if (!remarks || remarks.trim().length < 3) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['remarks'],
            message: 'remarks is required',
          },
        ],
      });
    }
    return this.requests.sendRemarksByCustomer(userId, id, { remarks });
  }

  // --- Provider: feed / inbox ---

  @Get('pro/requests/feed')
  async proFeed(@Req() request: Request) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.listProFeed(ctx.providerId);
  }

  @Get('pro/requests/inbox')
  async proInbox(
    @Req() request: Request,
    @Query()
    query: { status?: string; categoryId?: string; dialogScope?: string },
  ) {
    const ctx = await this.requests.requireProviderContext(request);
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

  @Get('pro/requests/eligible-categories')
  async eligibleCategories(@Req() request: Request) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.listProEligibleCategories(ctx.providerId);
  }

  @Get('pro/inbox-settings')
  async getInboxSettings(@Req() request: Request) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.getProInboxSettings(ctx.actorUserId, ctx.providerId);
  }

  @Put('pro/inbox-settings')
  async setInboxSettings(@Req() request: Request, @Body() body: unknown) {
    const ctx = await this.requests.requireProviderContext(request);
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
        : payload?.dialogScope === 'ACTIVE' ||
            payload?.dialogScope === undefined
          ? 'ACTIVE'
          : (payload?.dialogScope as any);

    return this.requests.setProInboxSettings(ctx.actorUserId, ctx.providerId, {
      status,
      categoryId,
      dialogScope,
    });
  }

  @Get('pro/requests/:id')
  async proById(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.getProById(ctx.providerId, id);
  }

  // --- Provider: state transitions ---

  @Post('pro/requests/:id/set-terms')
  async proSetTerms(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const ctx = await this.requests.requireProviderContext(request);
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

  @Post('pro/requests/:id/decline-offer')
  async proDeclineOffer(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.declineOfferByProvider(ctx.providerId, id);
  }

  @Get('pro/requests')
  async getProOrders(@Req() request: Request) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.requests.getOrders({ providerId: context.providerId });
  }

  @Get('pro/requests/by-id/:id')
  async getProOrderById(@Req() request: Request, @Param('id') id: string) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.requests.getOrderById(id, {
      providerId: context.providerId,
    });
  }

  @Post('pro/requests/:id/start-work')
  async proStartWork(@Req() request: Request, @Param('id') id: string) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.requests.startWorkByProvider(context.providerId, id);
  }

  @Post('pro/requests/:id/mark-rendered')
  async proMarkRendered(@Req() request: Request, @Param('id') id: string) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.requests.markServiceRenderedByProvider(context.providerId, id);
  }

  @Post('pro/requests/:id/request-acceptance')
  async proRequestAcceptance(@Req() request: Request, @Param('id') id: string) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.requests.requestAcceptanceByProvider(context.providerId, id);
  }

  @Post('pro/requests/:id/complete')
  async proComplete(@Req() request: Request, @Param('id') id: string) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!context.providerId) {
      throw new ForbiddenException('Active provider is required');
    }
    return this.requests.completeByProvider(context.providerId, id);
  }

  // --- Admin ---

  @Get('admin/requests')
  async getAdminRequests(@Req() request: Request) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.requests.getOrders();
  }
}

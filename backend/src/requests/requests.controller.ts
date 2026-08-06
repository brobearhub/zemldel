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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  parseRequestCategoryCreateDto,
  parseRequestServiceCreateDto,
  parseRequestUnlinkedCreateDto,
  RequestCategoryCreateDto,
  RequestCustomerDto,
  RequestProDto,
  RequestServiceCreateDto,
  RequestUnlinkedCreateDto,
} from './dto/request.dto';
import {
  parseRequestRemarkCreateDto,
  RequestRemarkCreateDto,
  RequestRemarkDto,
} from './dto/request-remark.dto';
import { RequestsService } from './requests.service';
import {
  ProEligibleCategoryDto,
  ProInboxSettingsDto,
  ProInboxSettingsUpdateDto,
} from './dto/pro-inbox-settings.dto';
import {
  ApiForbiddenErrorDto,
  ApiNotFoundErrorDto,
  ApiValidationErrorResponseDto,
} from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

@ApiTags('requests')
@ApiStandardErrors()
@Controller()
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  // --- Customer: create ---

  @Post('requests')
  @ApiBody({ type: RequestUnlinkedCreateDto })
  @ApiCreatedResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
  @ApiBody({ type: RequestCategoryCreateDto })
  @ApiParam({ name: 'id', type: String })
  @ApiCreatedResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
  @ApiBody({ type: RequestServiceCreateDto })
  @ApiParam({ name: 'id', type: String })
  @ApiCreatedResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
  @ApiOkResponse({ type: [RequestCustomerDto] })
  async listMine(@Req() request: Request) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.listMine(userId);
  }

  @Get('requests/mine/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Request not found' })
  async mineById(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.getMineById(userId, id);
  }

  // --- Customer: pre-order actions ---

  @Post('requests/mine/:id/initiate-order')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { conversationId: { type: 'string' } },
      required: ['conversationId'],
    },
  })
  @ApiOkResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
  async customerAcceptTerms(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.acceptTermsByCustomer(userId, id);
  }

  @Post('requests/mine/:id/select-provider')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { providerId: { type: 'string', format: 'uuid' } },
      required: ['providerId'],
    },
  })
  @ApiOkResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { termsVersion: { type: 'string' } },
      required: ['termsVersion'],
    },
  })
  @ApiOkResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async customerAcceptContract(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    const payload = body as { termsVersion?: unknown } | null | undefined;
    const termsVersion =
      payload &&
      typeof payload === 'object' &&
      typeof payload.termsVersion === 'string'
        ? payload.termsVersion
        : null;
    if (!termsVersion) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          {
            path: ['termsVersion'],
            message: 'termsVersion is required',
          },
        ],
      });
    }
    return this.requests.acceptContractByCustomer(userId, id, { termsVersion });
  }

  // --- Customer: order-phase actions ---

  @Post('requests/mine/:id/accept-result')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
  async acceptResult(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.acceptResultByCustomer(userId, id);
  }

  @Post('requests/mine/:id/send-remarks')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { remarks: { type: 'string', minLength: 3 } },
    },
  })
  @ApiOkResponse({ type: RequestCustomerDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
    return this.requests.sendRemarksByCustomer(userId, id, {
      remarks: remarks && remarks.trim().length >= 3 ? remarks : null,
    });
  }

  // --- Customer: remarks checklist ---

  @Get('requests/mine/:id/remarks')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: [RequestRemarkDto] })
  async listMineRemarks(@Req() request: Request, @Param('id') id: string) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.listRemarksByCustomer(userId, id);
  }

  @Post('requests/mine/:id/remarks')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: RequestRemarkCreateDto })
  @ApiOkResponse({ type: RequestRemarkDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async createMineRemark(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    const { data, issues } = parseRequestRemarkCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.requests.createRemarkByCustomer(userId, id, { text: data.text });
  }

  @Post('requests/mine/:id/remarks/:remarkId/complete')
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'remarkId', type: String })
  @ApiOkResponse({ type: RequestRemarkDto })
  async completeMineRemark(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('remarkId') remarkId: string,
  ) {
    const userId = this.requests.getRequiredActorUserId(request);
    return this.requests.completeRemarkByCustomer(userId, id, remarkId);
  }

  // --- Provider: feed / inbox ---

  @Get('pro/requests/feed')
  @ApiOkResponse({ type: [RequestProDto] })
  async proFeed(@Req() request: Request) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.listProFeed(ctx.providerId);
  }

  @Get('pro/requests/inbox')
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'dialogScope', required: false, type: String })
  @ApiOkResponse({ type: [RequestProDto] })
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
  @ApiOkResponse({ type: [ProEligibleCategoryDto] })
  async eligibleCategories(@Req() request: Request) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.listProEligibleCategories(ctx.providerId);
  }

  @Get('pro/inbox-settings')
  @ApiOkResponse({ type: ProInboxSettingsDto })
  async getInboxSettings(@Req() request: Request) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.getProInboxSettings(ctx.actorUserId, ctx.providerId);
  }

  @Put('pro/inbox-settings')
  @ApiBody({ type: ProInboxSettingsUpdateDto })
  @ApiOkResponse({ type: ProInboxSettingsDto })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestProDto })
  @ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Request not found' })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async proById(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.getProById(ctx.providerId, id);
  }

  // --- Provider: state transitions ---

  @Post('pro/requests/:id/set-terms')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { dealTerms: { type: 'object', additionalProperties: true } },
      required: ['dealTerms'],
    },
  })
  @ApiOkResponse({ type: RequestProDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestProDto })
  async proDeclineOffer(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.declineOfferByProvider(ctx.providerId, id);
  }

  // --- Provider: remarks checklist ---

  @Get('pro/requests/:id/remarks')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: [RequestRemarkDto] })
  async listProRemarks(@Req() request: Request, @Param('id') id: string) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.listRemarksByProvider(ctx.providerId, id);
  }

  @Post('pro/requests/:id/remarks')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: RequestRemarkCreateDto })
  @ApiOkResponse({ type: RequestRemarkDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  async createProRemark(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const ctx = await this.requests.requireProviderContext(request);
    const { data, issues } = parseRequestRemarkCreateDto(body);
    if (!data) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.requests.createRemarkByProvider(ctx.providerId, id, {
      text: data.text,
    });
  }

  @Post('pro/requests/:id/remarks/:remarkId/complete')
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'remarkId', type: String })
  @ApiOkResponse({ type: RequestRemarkDto })
  async completeProRemark(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('remarkId') remarkId: string,
  ) {
    const ctx = await this.requests.requireProviderContext(request);
    return this.requests.completeRemarkByProvider(ctx.providerId, id, remarkId);
  }

  @Get('pro/requests')
  @ApiOkResponse({ type: [RequestCustomerDto] })
  async getProOrders(@Req() request: Request) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.requests.getOrders({ providerId: context.providerId });
  }

  @Get('pro/requests/by-id/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
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
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: RequestCustomerDto })
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
  @ApiOkResponse({ type: [RequestCustomerDto] })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' })
  async getAdminRequests(@Req() request: Request) {
    const context = await this.requests.getManagementContext(request, 'read');
    if (!context.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return this.requests.getOrders();
  }
}

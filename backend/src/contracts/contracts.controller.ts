import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ContractsService } from './contracts.service';

@Controller()
export class ContractsController {
  constructor(
    private readonly contracts: ContractsService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  private getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  private pickIp(request: Request) {
    return request.ip ?? null;
  }

  private pickUserAgent(request: Request) {
    const ua = request.header('user-agent');
    return typeof ua === 'string' ? ua : null;
  }

  // Templates (provider-scoped)
  @Get('pro/contracts/templates')
  listTemplates(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.listTemplates(actorUserId);
  }

  @Get('pro/contracts/templates/:id')
  getTemplate(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.getTemplateById(actorUserId, id);
  }

  @Post('pro/contracts/templates')
  createTemplate(@Req() request: Request, @Body() body: unknown) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as
      | {
          title?: unknown;
          markdown?: unknown;
          document?: unknown;
          content?: unknown;
        }
      | null
      | undefined;
    return this.contracts.createTemplate(actorUserId, {
      title: payload?.title,
      markdown: payload?.markdown,
      document: payload?.document,
      content: payload?.content,
    });
  }

  @Put('pro/contracts/templates/:id')
  updateTemplate(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as
      | {
          title?: unknown;
          markdown?: unknown;
          document?: unknown;
          content?: unknown;
        }
      | null
      | undefined;
    return this.contracts.updateTemplate(actorUserId, id, {
      title: payload?.title,
      markdown: payload?.markdown,
      document: payload?.document,
      content: payload?.content,
    });
  }

  @Delete('pro/contracts/templates/:id')
  deleteTemplate(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.deleteTemplate(actorUserId, id);
  }

  @Post('pro/contracts/templates/:id/fork')
  forkTemplate(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as { title?: unknown } | null | undefined;
    return this.contracts.forkTemplate(actorUserId, id, {
      title: payload?.title,
    });
  }

  // Instances
  @Get('pro/contracts/instances')
  listInstances(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.listInstancesForProvider(actorUserId);
  }

  @Get('pro/contracts/instances/:id')
  getInstancePro(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.getInstanceForProvider(actorUserId, id);
  }

  @Put('pro/contracts/instances/:id')
  updateInstanceDraftPro(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as
      | {
          title?: unknown;
          markdown?: unknown;
          document?: unknown;
          content?: unknown;
        }
      | null
      | undefined;
    return this.contracts.updateInstanceDraftByProvider(actorUserId, id, {
      title: payload?.title,
      markdown: payload?.markdown,
      document: payload?.document,
      content: payload?.content,
    });
  }

  @Post('pro/contracts/instances/:id/send')
  sendInstancePro(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.sendInstanceToCustomerByProvider(actorUserId, id);
  }

  @Post('pro/contracts/instances')
  createInstance(@Req() request: Request, @Body() body: unknown) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as
      | { templateId?: unknown; serviceRequestId?: unknown; title?: unknown }
      | null
      | undefined;
    return this.contracts.createInstance(actorUserId, {
      templateId: payload?.templateId,
      requestId: payload?.serviceRequestId,
      title: payload?.title,
    });
  }

  @Post('pro/contracts/requests/:requestId/instances/:id/attach')
  attachInstanceToRequest(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('id') id: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.attachDraftToRequestByProvider(actorUserId, {
      contractId: id,
      requestId,
    });
  }

  // Customer side view + sign
  @Get('contracts/requests/:id/instances')
  listInstancesCustomerForRequest(
    @Req() request: Request,
    @Param('id') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.listInstancesForCustomerByRequest(
      actorUserId,
      requestId,
    );
  }

  @Get('contracts/instances/:id')
  getInstanceCustomer(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.getInstanceForCustomer(actorUserId, id);
  }

  @Post('contracts/instances/:id/feedback')
  addFeedbackCustomer(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as { body?: unknown } | null | undefined;
    return this.contracts.addFeedbackByCustomer({
      actorUserId,
      contractId: id,
      body: payload?.body,
    });
  }

  @Post('contracts/instances/:id/comments')
  addCommentCustomer(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as
      | { anchor?: unknown; quote?: unknown; body?: unknown }
      | null
      | undefined;
    return this.contracts.addCommentByCustomer({
      actorUserId,
      contractId: id,
      anchor: payload?.anchor,
      quote: payload?.quote,
      body: payload?.body,
    });
  }

  @Post('pro/contracts/instances/:id/comments/:threadId/replies')
  replyCommentProvider(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('threadId') threadId: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as { body?: unknown } | null | undefined;
    return this.contracts.replyToCommentByProvider({
      actorUserId,
      contractId: id,
      threadId,
      body: payload?.body,
    });
  }

  @Post('pro/contracts/instances/:id/comments/:threadId/resolve')
  resolveCommentProvider(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('threadId') threadId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.resolveCommentByProvider({
      actorUserId,
      contractId: id,
      threadId,
    });
  }

  @Post('contracts/instances/:id/sign')
  signCustomer(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.signByCustomer({
      actorUserId,
      contractId: id,
      ip: this.pickIp(request),
      userAgent: this.pickUserAgent(request),
    });
  }

  // Provider sign
  @Post('pro/contracts/instances/:id/sign')
  signProvider(@Req() request: Request, @Param('id') id: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.signByProvider({
      actorUserId,
      contractId: id,
      ip: this.pickIp(request),
      userAgent: this.pickUserAgent(request),
    });
  }

  @Get('pro/contracts/legal-profile')
  getProviderLegalProfile(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.getProviderLegalProfile(actorUserId);
  }

  @Put('pro/contracts/legal-profile')
  updateProviderLegalProfile(@Req() request: Request, @Body() body: unknown) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.upsertProviderLegalProfile(actorUserId, body);
  }

  @Get('contracts/legal-profile')
  getCustomerLegalProfile(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.getCustomerLegalProfile(actorUserId);
  }

  @Put('contracts/legal-profile')
  updateCustomerLegalProfile(@Req() request: Request, @Body() body: unknown) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.upsertCustomerLegalProfile(actorUserId, body);
  }

  @Get('pro/contracts/blocks')
  listPublishedBlocks(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.listPublishedBlocks(actorUserId);
  }

  @Get('admin/contracts/blocks')
  listBlocksAdmin(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.listBlocksAdmin(actorUserId);
  }

  @Post('admin/contracts/blocks')
  createBlockAdmin(@Req() request: Request, @Body() body: unknown) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.createBlockAdmin(actorUserId, body);
  }

  @Put('admin/contracts/blocks/:id')
  updateBlockAdmin(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contracts.updateBlockAdmin(actorUserId, id, body);
  }

  @Patch('admin/contracts/blocks/:id/status')
  setBlockStatusAdmin(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as { status?: unknown } | null | undefined;
    return this.contracts.setBlockStatusAdmin(actorUserId, id, payload?.status);
  }
}

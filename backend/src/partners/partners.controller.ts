import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { PartnersService } from './partners.service';
import { PartnerDelegationService } from './partner-delegation.service';
import {
  DelegatePartnerDto,
  InvitePartnerDto,
  InvitePartnerEmailDto,
  PartnerDirectoryQuery,
  RespondPartnerDto,
} from './partner.dto';

@ApiTags('partners')
@Controller()
export class PartnersController {
  constructor(
    private readonly partners: PartnersService,
    private readonly delegation: PartnerDelegationService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get('pro/partners')
  mine(@Req() req: Request) {
    return this.partners.mine(this.auth.getUserIdFromRequest(req));
  }

  @Get('pro/partners/directory')
  directory(@Req() req: Request, @Query() query: PartnerDirectoryQuery) {
    return this.partners.directory(this.auth.getUserIdFromRequest(req), query);
  }

  @Post('pro/partners')
  invite(@Req() req: Request, @Body() body: InvitePartnerDto) {
    return this.partners.invite(
      this.auth.getUserIdFromRequest(req),
      body.providerId,
    );
  }

  @Post('pro/partners/email')
  email(@Req() req: Request, @Body() body: InvitePartnerEmailDto) {
    return this.partners.inviteEmail(
      this.auth.getUserIdFromRequest(req),
      body.email,
    );
  }

  @Post('pro/partners/:id/respond')
  respond(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RespondPartnerDto,
  ) {
    return this.partners.respond(
      this.auth.getUserIdFromRequest(req),
      id,
      body.action,
    );
  }

  @Post('pro/partners/:id/conversation')
  conversation(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.partners.conversation(this.auth.getUserIdFromRequest(req), id);
  }

  @Get('partner-invitations/:token')
  invitation(@Param('token') token: string) {
    return this.partners.invitation(token);
  }

  @Post('partner-invitations/:token/accept')
  accept(@Req() req: Request, @Param('token') token: string) {
    return this.partners.acceptInvitation(
      this.auth.getUserIdFromRequest(req),
      token,
    );
  }

  @Post('pro/requests/:id/delegate')
  delegate(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DelegatePartnerDto,
  ) {
    return this.delegation.delegate(
      this.auth.getUserIdFromRequest(req),
      id,
      body.partnerProviderId,
      body.confirmed,
    );
  }
}

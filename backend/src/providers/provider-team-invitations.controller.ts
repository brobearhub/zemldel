import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { AcceptProviderInvitationDto } from './dto/provider-team.dto';
import { ProviderTeamService } from './provider-team.service';

@ApiTags('provider-team')
@ApiStandardErrors()
@Controller('provider-team-invitations')
export class ProviderTeamInvitationsController {
  constructor(
    private readonly team: ProviderTeamService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  get(@Param('token') token: string) {
    return this.team.getInvitation(token);
  }

  @Post(':token/accept')
  accept(
    @Req() req: Request,
    @Param('token') token: string,
    @Body() body: AcceptProviderInvitationDto,
  ) {
    return this.team.accept(this.auth.getUserIdFromRequest(req), token, body);
  }
}

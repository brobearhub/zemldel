import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { DocumentsService } from './documents.service';
import { parsePassportDto } from './dto/passport.dto';

@Controller()
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
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

  @Get('documents/passport/mine')
  async getMyPassport(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.documents.getMyPassport(actorUserId);
  }

  @Put('documents/passport/mine')
  async upsertMyPassport(@Req() request: Request, @Body() body: unknown) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { data, issues } = parsePassportDto(body);
    if (!data) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues,
      });
    }
    return this.documents.upsertMyPassport({
      actorUserId,
      passport: data,
      ip: this.pickIp(request),
      userAgent: this.pickUserAgent(request),
    });
  }

  @Delete('documents/passport/mine')
  async deleteMyPassport(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.documents.deleteMyPassport({
      actorUserId,
      ip: this.pickIp(request),
      userAgent: this.pickUserAgent(request),
    });
  }

  @Get('pro/requests/:id/passport')
  async getPassportForProvider(
    @Req() request: Request,
    @Param('id') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.documents.getPassportForProviderByOrder({
      actorUserId,
      requestId,
      ip: this.pickIp(request),
      userAgent: this.pickUserAgent(request),
    });
  }
}

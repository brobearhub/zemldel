import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { PassportAccessService } from './passport-access.service';

@Controller('pro/requests/:requestId/passport/access-requests')
export class PassportAccessRequestsController {
  constructor(
    private readonly access: PassportAccessService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @Req() request: Request,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
  ) {
    return this.access.requestedForProvider(
      this.auth.getUserIdFromRequest(request),
      requestId,
    );
  }

  @Post(':kind')
  @Header('Cache-Control', 'private, no-store')
  create(
    @Req() request: Request,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Param('kind') kind: string,
  ) {
    if (kind !== 'FORM' && kind !== 'PHOTO')
      throw new BadRequestException('Неизвестный вид доступа');
    return this.access.requestAccess(
      this.auth.getUserIdFromRequest(request),
      requestId,
      kind,
    );
  }
}

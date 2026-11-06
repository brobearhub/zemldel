import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { PassportPhotosService } from './passport-photos.service';

@Controller('pro/requests/:requestId/passport/photos')
export class PassportProviderPhotosController {
  constructor(
    private readonly photos: PassportPhotosService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @Req() request: Request,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
  ) {
    return this.photos.listForProvider(
      this.auth.getUserIdFromRequest(request),
      requestId,
    );
  }

  @Get(':id')
  async read(
    @Req() request: Request,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ) {
    const photo = await this.photos.readForProvider(
      this.auth.getUserIdFromRequest(request),
      requestId,
      id,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', photo.mimeType);
    response.setHeader(
      'Content-Disposition',
      'inline; filename="passport-photo"',
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(photo.body);
  }
}

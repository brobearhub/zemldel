import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { PassportAccessService } from './passport-access.service';

@Controller('documents/passport/access')
export class PassportAccessController {
  constructor(
    private readonly access: PassportAccessService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  mine(@Req() request: Request) {
    return this.access.mine(this.auth.getUserIdFromRequest(request));
  }

  @Get('requests')
  @Header('Cache-Control', 'private, no-store')
  async requests(@Req() request: Request) {
    return {
      requests: await this.access.pendingRequests(
        this.auth.getUserIdFromRequest(request),
      ),
    };
  }

  @Delete('requests/:id/:kind')
  @Header('Cache-Control', 'private, no-store')
  decline(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('kind') kind: string,
  ) {
    if (kind !== 'FORM' && kind !== 'PHOTO')
      throw new BadRequestException('Неизвестный вид доступа');
    return this.access.declineRequest(
      this.auth.getUserIdFromRequest(request),
      id,
      kind,
    );
  }

  @Put(':id')
  @Header('Cache-Control', 'private, no-store')
  save(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const userId = this.auth.getUserIdFromRequest(request);
    if (
      !body ||
      typeof body !== 'object' ||
      !('form' in body) ||
      typeof body.form !== 'boolean' ||
      !('photo' in body) ||
      typeof body.photo !== 'boolean' ||
      !('durationDays' in body) ||
      typeof body.durationDays !== 'number' ||
      ![1, 7, 30].includes(body.durationDays)
    )
      throw new BadRequestException(
        'Выберите данные и срок доступа: 1, 7 или 30 дней',
      );
    if ('providerId' in body && typeof body.providerId !== 'string')
      throw new BadRequestException('Укажите выбранного исполнителя');
    return this.access.save(userId, id, {
      form: body.form,
      photo: body.photo,
      durationDays: body.durationDays,
      providerId:
        'providerId' in body ? (body.providerId as string) : undefined,
    });
  }

  @Delete(':id/:kind')
  @Header('Cache-Control', 'private, no-store')
  revoke(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('kind') kind: string,
  ) {
    const userId = this.auth.getUserIdFromRequest(request);
    if (kind !== 'FORM' && kind !== 'PHOTO')
      throw new BadRequestException('Неизвестный вид доступа');
    return this.access.revoke(userId, id, kind);
  }
}

import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProviderWorkStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ProviderWorkService } from './provider-work.service';
import type { RequestWithChanges } from './request-realtime.interceptor';

class CreateClientRequestDto {
  @IsOptional() @IsUUID() serviceId?: string;
  @IsOptional() @IsString() @MaxLength(5000) message?: string;
  @IsOptional() @IsUUID() requestCityId?: string;
  @IsOptional() @IsString() @MaxLength(500) location?: string;
  @IsOptional() @IsUUID() operationId?: string;
}

class UpdateProviderWorkDto {
  @IsEnum(ProviderWorkStatus) status!: ProviderWorkStatus;
}

class AddWorkNoteDto {
  @IsString() @MaxLength(5000) text!: string;
  @IsOptional() @IsUUID() operationId?: string;
}

@ApiTags('requests')
@Controller()
export class ProviderWorkController {
  constructor(
    private readonly work: ProviderWorkService,
    private readonly auth: InternalAuthService,
  ) {}

  @Post('pro/clients/:clientId/requests')
  async create(
    @Req() request: RequestWithChanges,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() body: CreateClientRequestDto,
  ) {
    return this.work.create(
      this.auth.getUserIdFromRequest(request),
      clientId,
      body,
      (ids) => {
        request.changedRequestIds = ids;
      },
    );
  }

  @Get('pro/requests/:id/provider-work')
  @Header('Cache-Control', 'private, no-store')
  history(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.work.history(this.auth.getUserIdFromRequest(request), id);
  }

  @Patch('pro/requests/:id/provider-work')
  setStatus(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProviderWorkDto,
  ) {
    return this.work.setStatus(
      this.auth.getUserIdFromRequest(request),
      id,
      body.status,
    );
  }

  @Get('pro/requests/:id/provider-notes')
  @Header('Cache-Control', 'private, no-store')
  listNotes(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.work.listNotes(this.auth.getUserIdFromRequest(request), id);
  }

  @Post('pro/requests/:id/provider-notes')
  addNote(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddWorkNoteDto,
  ) {
    return this.work.addNote(this.auth.getUserIdFromRequest(request), id, body);
  }
}

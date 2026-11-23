import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { RequestWithChanges } from '../requests/request-realtime.interceptor';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ProviderClientsService } from './provider-clients.service';

class CreateClientDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}

class EditClientDto {
  @ValidateIf((_obj, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string | null;
}

@ApiTags('provider-clients')
@Controller('pro/clients')
export class ProviderClientsController {
  constructor(
    private readonly clients: ProviderClientsService,
    private readonly auth: InternalAuthService,
  ) {}

  private provider(req: Request) {
    return this.clients.providerFor(this.auth.getUserIdFromRequest(req));
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Req() req: Request) {
    return this.clients.list(await this.provider(req));
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateClientDto) {
    return this.clients.create(await this.provider(req), dto);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.detail(await this.provider(req), id);
  }

  @Patch(':id')
  async edit(
    @Req() req: RequestWithChanges,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditClientDto,
  ) {
    const { changedRequestIds, ...client } = await this.clients.edit(
      await this.provider(req),
      id,
      dto,
    );
    req.changedRequestIds = changedRequestIds;
    return client;
  }

  @Post(':id/invitation')
  @Header('Cache-Control', 'private, no-store')
  async issue(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.issue(await this.provider(req), id);
  }

  @Delete(':id/invitation')
  async revoke(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.revoke(await this.provider(req), id);
  }
}

@ApiTags('client-invitations')
@Controller('client-invitations')
export class ClientInvitationsController {
  constructor(
    private readonly clients: ProviderClientsService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get(':token')
  @Header('Cache-Control', 'private, no-store')
  preview(@Param('token') token: string) {
    return this.clients.preview(token);
  }

  @Post(':token/accept')
  async accept(@Req() req: RequestWithChanges, @Param('token') token: string) {
    const { clientId, changedRequestIds } = await this.clients.accept(
      this.auth.getUserIdFromRequest(req),
      token,
    );
    req.changedRequestIds = changedRequestIds;
    return { clientId };
  }
}

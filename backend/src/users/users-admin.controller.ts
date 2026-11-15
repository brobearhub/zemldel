import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { UsersAdminService } from './users-admin.service';

@ApiTags('admin')
@ApiStandardErrors()
@Controller('admin/users')
export class UsersAdminController {
  constructor(
    private readonly users: UsersAdminService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @Req() request: Request,
    @Query('q') q?: string,
    @Query('page') page?: string,
  ) {
    return this.users.list(this.auth.getUserIdFromRequest(request), {
      q,
      page,
    });
  }

  @Get(':id/passport-audit')
  @Header('Cache-Control', 'private, no-store')
  passportAudit(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page') page?: string,
  ) {
    return this.users.passportAudit(
      this.auth.getUserIdFromRequest(request),
      id,
      page,
    );
  }
}

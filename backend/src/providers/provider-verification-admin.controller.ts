import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { RejectVerificationDto } from './dto/reject-verification.dto';
import { ProviderVerificationAdminService } from './provider-verification-admin.service';

@ApiTags('admin')
@ApiStandardErrors()
@Controller('admin/provider-verifications')
export class ProviderVerificationAdminController {
  constructor(
    private readonly admin: ProviderVerificationAdminService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  @Get('pending-count')
  pendingCount(@Req() request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.admin.pendingCount(userId);
  }

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'q', required: false })
  list(
    @Req() request: Request,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.admin.list(userId, { status, q });
  }

  @Get(':id')
  getOne(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.admin.getOne(userId, id);
  }

  @Post(':id/approve')
  approve(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.admin.approve(userId, id);
  }

  @Post(':id/fns-manual')
  markFnsManual(@Req() request: Request, @Param('id') id: string) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.admin.markFnsManual(userId, id);
  }

  @Post(':id/reject')
  reject(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: RejectVerificationDto,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    return this.admin.reject(userId, id, body.reason);
  }
}

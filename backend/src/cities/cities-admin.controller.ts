import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { ApiForbiddenErrorDto } from '../common/dto/api-error-response.dto';
import { CitiesService } from './cities.service';
import { CityImportEventDto, CityImportRunDto } from './dto/city-admin.dto';

@ApiTags('admin/cities')
@ApiStandardErrors()
@Controller()
export class CitiesAdminController {
  constructor(
    private readonly citiesService: CitiesService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  private async requirePlatformAdmin(request: Request) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const ctx = await this.authService.getServiceManagementContext(userId, 'read');
    if (!ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return ctx;
  }

  @Get('admin/city-import-runs')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: [CityImportRunDto] })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto })
  async listImportRuns(@Req() request: Request, @Query('limit') limit = '50') {
    await this.requirePlatformAdmin(request);
    const limitNumber = Number(limit);
    return this.citiesService.listImportRuns(
      Number.isFinite(limitNumber) ? limitNumber : 50,
    );
  }

  @Get('admin/city-import-runs/:runId/events')
  @ApiParam({ name: 'runId', type: String })
  @ApiOkResponse({ type: [CityImportEventDto] })
  @ApiForbiddenResponse({ type: ApiForbiddenErrorDto })
  async listImportRunEvents(@Req() request: Request, @Param('runId') runId: string) {
    await this.requirePlatformAdmin(request);
    return this.citiesService.listImportRunEvents(runId);
  }
}

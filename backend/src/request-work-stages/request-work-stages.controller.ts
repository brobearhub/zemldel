import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { RequestWorkStagesService } from './request-work-stages.service';
import {
  CreateWorkStageDto,
  ReplaceCustomWorkStageStatusesDto,
  UpdateWorkStageDraftDto,
  UpdateWorkStageStatusDto,
  WorkStageDto,
  WorkStageStatusesResponseDto,
} from './dto/work-stages.dto';

@ApiStandardErrors()
@ApiTags('request-work-stages')
@Controller()
export class RequestWorkStagesController {
  constructor(
    private readonly stages: RequestWorkStagesService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  private getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  @Get('pro/settings/work-stage-statuses')
  @ApiOkResponse({ type: WorkStageStatusesResponseDto })
  getStatuses(@Req() request: Request) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.getWorkStageStatuses({ actorUserId });
  }

  @Put('pro/settings/work-stage-statuses')
  @ApiOkResponse({ type: WorkStageStatusesResponseDto })
  putStatuses(
    @Req() request: Request,
    @Body() body: ReplaceCustomWorkStageStatusesDto,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.replaceCustomWorkStageStatuses({
      actorUserId,
      custom: body.custom ?? [],
    });
  }

  @Get('pro/requests/:requestId/work-stages')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [WorkStageDto] })
  listForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.listForProvider({ actorUserId, requestId });
  }

  @Post('pro/requests/:requestId/work-stages')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: WorkStageDto })
  create(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateWorkStageDto,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.createDraft({
      actorUserId,
      requestId,
      title: body.title,
      description: body.description,
      statusKey: body.statusKey,
    });
  }

  @Patch('pro/requests/:requestId/work-stages/:stageId')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiOkResponse({ type: WorkStageDto })
  updateDraft(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Body() body: UpdateWorkStageDraftDto,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.updateDraft({
      actorUserId,
      requestId,
      stageId,
      title: body.title,
      description: body.description,
      statusKey: body.statusKey,
      sortOrder: body.sortOrder,
    });
  }

  @Post('pro/requests/:requestId/work-stages/:stageId/publish')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiOkResponse({ type: WorkStageDto })
  publish(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.publish({ actorUserId, requestId, stageId });
  }

  @Patch('pro/requests/:requestId/work-stages/:stageId/status')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiOkResponse({ type: WorkStageDto })
  updateStatus(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Body() body: UpdateWorkStageStatusDto,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.updateStatus({
      actorUserId,
      requestId,
      stageId,
      statusKey: body.statusKey,
    });
  }

  @Delete('pro/requests/:requestId/work-stages/:stageId')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteDraft(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.deleteDraft({ actorUserId, requestId, stageId });
  }

  @Get('requests/:requestId/work-stages')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [WorkStageDto] })
  listForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.listForCustomer({ actorUserId, requestId });
  }
}

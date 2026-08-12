import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnprocessableEntityException,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody as ApiBodyDoc,
  ApiConsumes,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { pipeline } from 'node:stream/promises';
import { InternalAuthService } from '../auth/internal-auth.service';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import {
  RequestWorkStagesService,
  normalizeWorkStageFileExt,
} from './request-work-stages.service';
import {
  CreateWorkStageDocSlotDto,
  CreateWorkStageDto,
  ReplaceCustomWorkStageStatusesDto,
  UpdateWorkStageDraftDto,
  UpdateWorkStageStatusDto,
  WorkStageDocSlotDto,
  WorkStageDto,
  WorkStageFileDto,
  WorkStageStatusesResponseDto,
} from './dto/work-stages.dto';

function fileInterceptor() {
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = normalizeWorkStageFileExt(file.originalname, file.mimetype);
      if (!ext) {
        cb(new Error('Unsupported file type'), false);
        return;
      }
      cb(null, true);
    },
  });
}

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
  deleteStage(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.deleteStage({ actorUserId, requestId, stageId });
  }

  @Post('pro/requests/:requestId/work-stages/:stageId/files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: WorkStageFileDto })
  @UseInterceptors(fileInterceptor())
  async uploadProviderFile(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const file = (request as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['file'], message: 'file is required' }],
      });
    }
    try {
      return await this.stages.uploadProviderFile({
        actorUserId,
        requestId,
        stageId,
        file,
      });
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Delete('pro/requests/:requestId/work-stages/:stageId/files/:fileId')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteProviderFile(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('fileId') fileId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.deleteProviderFile({
      actorUserId,
      requestId,
      stageId,
      fileId,
    });
  }

  @Get('pro/requests/:requestId/work-stages/:stageId/files/:fileId/download')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadProviderFile(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.stages.downloadProviderFile({
        actorUserId,
        requestId,
        stageId,
        fileId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader(
      'content-disposition',
      `${disposition}; filename="${fileName}"`,
    );
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }

  @Post('pro/requests/:requestId/work-stages/:stageId/doc-slots')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiOkResponse({ type: WorkStageDocSlotDto })
  createDocSlot(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Body() body: CreateWorkStageDocSlotDto,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.createDocSlot({
      actorUserId,
      requestId,
      stageId,
      title: body.title,
    });
  }

  @Delete('pro/requests/:requestId/work-stages/:stageId/doc-slots/:slotId')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteDocSlot(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('slotId') slotId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.deleteDocSlot({
      actorUserId,
      requestId,
      stageId,
      slotId,
    });
  }

  @Get('pro/requests/:requestId/work-stages/:stageId/doc-slots/:slotId/download')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadDocSlotProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('slotId') slotId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.stages.downloadDocSlotForProvider({
        actorUserId,
        requestId,
        stageId,
        slotId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader(
      'content-disposition',
      `${disposition}; filename="${fileName}"`,
    );
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }

  @Get('requests/mine/:requestId/work-stages')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [WorkStageDto] })
  listForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.stages.listForCustomer({ actorUserId, requestId });
  }

  @Post('requests/mine/:requestId/work-stages/:stageId/doc-slots/:slotId/upload')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiValidationErrorResponseDto })
  @UseInterceptors(fileInterceptor())
  async uploadCustomerDocSlot(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('slotId') slotId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const file = (request as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['file'], message: 'file is required' }],
      });
    }
    try {
      return await this.stages.uploadCustomerDocSlot({
        actorUserId,
        requestId,
        stageId,
        slotId,
        file,
      });
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Get('requests/mine/:requestId/work-stages/:stageId/files/:fileId/download')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadCustomerFile(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.stages.downloadCustomerFile({
        actorUserId,
        requestId,
        stageId,
        fileId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader(
      'content-disposition',
      `${disposition}; filename="${fileName}"`,
    );
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }

  @Get(
    'requests/mine/:requestId/work-stages/:stageId/doc-slots/:slotId/download',
  )
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'stageId', type: String })
  @ApiParam({ name: 'slotId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadCustomerDocSlot(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('stageId') stageId: string,
    @Param('slotId') slotId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.stages.downloadDocSlotForCustomer({
        actorUserId,
        requestId,
        stageId,
        slotId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader(
      'content-disposition',
      `${disposition}; filename="${fileName}"`,
    );
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ContractFilesService } from './contract-files.service';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import {
  ContractFileItemDto,
  ContractFilesUploadResponseDto,
} from './dto/contract-file-responses.dto';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

const ALLOWED_EXT = new Set(['.pdf', '.docx']);

function normalizeExt(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return '.docx';
  }
  return '';
}

@ApiStandardErrors()
@Controller()
export class ContractFilesController {
  constructor(
    private readonly contractFiles: ContractFilesService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  private getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  @Get('pro/requests/:requestId/contract-files')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ContractFileItemDto] })
  listForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listForProvider({ actorUserId, requestId });
  }

  @Post('pro/requests/:requestId/contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @ApiOkResponse({ type: ContractFilesUploadResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = normalizeExt(file.originalname, file.mimetype);
        if (!ext) {
          cb(new Error('Unsupported file type'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const files = (request as any).files as Express.Multer.File[] | undefined;

    if (!files?.length) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['files'], message: 'files is required' }],
      });
    }

    try {
      const created = await this.contractFiles.uploadForProvider({
        actorUserId,
        requestId,
        files,
      });
      return res.json(created);
    } catch (e) {
      // Multer errors are not always wrapped in HttpException.
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Get('requests/mine/:requestId/contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ContractFileItemDto] })
  listForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listForCustomer({ actorUserId, requestId });
  }

  @Post('requests/mine/:requestId/contract-files/:fileId/approve')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  approve(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('fileId') fileId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.approveByCustomer({
      actorUserId,
      requestId,
      fileId,
    });
  }

  @Post('requests/mine/:requestId/contract-files/:fileId/revision')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: { message: { type: 'string', minLength: 3 } },
      required: ['message'],
    },
  })
  @ApiOkResponse({ type: OkResponseDto })
  requestRevision(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('fileId') fileId: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as { message?: unknown } | null | undefined;
    return this.contractFiles.requestRevisionByCustomer({
      actorUserId,
      requestId,
      fileId,
      message: payload?.message,
    });
  }

  @Get('pro/contract-files/:fileId/download')
  @ApiParam({ name: 'fileId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadProvider(
    @Req() request: Request,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.contractFiles.getDownloadStreamForProvider({
        actorUserId,
        fileId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader('content-disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }

  @Delete('pro/contract-files/:fileId')
  @ApiParam({ name: 'fileId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteProvider(@Req() request: Request, @Param('fileId') fileId: string) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.deleteForProvider({ actorUserId, fileId });
  }

  @Get('requests/mine/:requestId/contract-files/:fileId/download')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.contractFiles.getDownloadStreamForCustomer({
        actorUserId,
        requestId,
        fileId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader('content-disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }
}


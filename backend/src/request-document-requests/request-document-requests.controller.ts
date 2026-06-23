import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
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
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { InternalAuthService } from '../auth/internal-auth.service';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { RequestDocumentRequestsService } from './request-document-requests.service';
import {
  CreateRequestDocumentRequestDto,
  RequestDocumentRequestItemDto,
} from './dto/request-document-requests.dto';

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
@ApiTags('request-document-requests')
@Controller()
export class RequestDocumentRequestsController {
  constructor(
    private readonly requests: RequestDocumentRequestsService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  private getRequiredActorUserId(request: Request) {
    return this.internalAuth.getUserIdFromRequest(request);
  }

  @Get('pro/requests/:requestId/document-requests')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [RequestDocumentRequestItemDto] })
  listForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.requests.listForProvider({ actorUserId, requestId });
  }

  @Post('pro/requests/:requestId/document-requests')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: RequestDocumentRequestItemDto })
  createForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateRequestDocumentRequestDto,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.requests.createForProvider({ actorUserId, requestId, title: body.title });
  }

  @Delete('pro/requests/:requestId/document-requests/:docRequestId')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'docRequestId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('docRequestId') docRequestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.requests.deleteForProvider({ actorUserId, requestId, docRequestId });
  }

  @Get('requests/mine/:requestId/document-requests')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [RequestDocumentRequestItemDto] })
  listForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.requests.listForCustomer({ actorUserId, requestId });
  }

  @Post('requests/mine/:requestId/document-requests/:docRequestId/upload')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'docRequestId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  @UseInterceptors(
    FileInterceptor('file', {
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
  async uploadForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('docRequestId') docRequestId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const file = (request as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['file'], message: 'file is required' }],
      });
    }

    try {
      await this.requests.uploadForCustomer({
        actorUserId,
        requestId,
        docRequestId,
        file,
      });
      return res.json({ ok: true });
    } catch (e) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Delete('requests/mine/:requestId/document-requests/:docRequestId/file')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'docRequestId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteFileForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('docRequestId') docRequestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.requests.deleteFileForCustomer({
      actorUserId,
      requestId,
      docRequestId,
    });
  }

  @Get('pro/document-requests/:docRequestId/download')
  @ApiParam({ name: 'docRequestId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadProvider(
    @Req() request: Request,
    @Param('docRequestId') docRequestId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.requests.getDownloadStreamForProvider({
        actorUserId,
        docRequestId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader('content-disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }

  @Get('requests/mine/:requestId/document-requests/:docRequestId/download')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'docRequestId', type: String })
  @ApiQuery({ name: 'inline', required: false, type: String })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async downloadCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('docRequestId') docRequestId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const { stream, fileName, mimeType, disposition } =
      await this.requests.getDownloadStreamForCustomer({
        actorUserId,
        requestId,
        docRequestId,
        inline: request.query.inline === '1' || request.query.inline === 'true',
      });
    res.setHeader('content-type', mimeType);
    res.setHeader('content-disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }
}


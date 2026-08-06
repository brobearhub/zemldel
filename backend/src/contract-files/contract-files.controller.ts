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
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
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
  ContractBundleItemDto,
} from './dto/contract-file-responses.dto';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

const ALLOWED_EXT = new Set(['.pdf', '.docx']);
const ALLOWED_SIG_EXT = new Set(['.sig', '.sgn', '.p7s']);

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

function normalizeSigExt(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_SIG_EXT.has(ext) ? ext : '';
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

  @Get('pro/requests/:requestId/provider-misc')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ContractFileItemDto] })
  listMiscForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listMiscForProvider({ actorUserId, requestId });
  }

  @Post('pro/requests/:requestId/provider-misc')
  @ApiTags('contract-files')
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
  async uploadMiscForProvider(
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
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
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

  @Get('pro/requests/:requestId/contract-bundles')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ContractBundleItemDto] })
  listBundlesForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listBundlesForProvider({ actorUserId, requestId });
  }

  @Post('pro/requests/:requestId/contract-bundles')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: {
        document: { type: 'string', format: 'binary' },
        signature: { type: 'string', format: 'binary' },
      },
      required: ['document', 'signature'],
    },
  })
  @ApiOkResponse({ schema: { type: 'object', properties: { bundleId: { type: 'string', format: 'uuid' } }, required: ['bundleId'] } })
  @ApiUnprocessableEntityResponse({
    type: ApiValidationErrorResponseDto,
    description: 'Validation failed',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'document', maxCount: 1 },
        { name: 'signature', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const field = String(file?.fieldname ?? '');
          const ok =
            field === 'document'
              ? Boolean(normalizeExt(file.originalname, file.mimetype))
              : field === 'signature'
                ? Boolean(normalizeSigExt(file.originalname))
                : false;
          if (!ok) {
            cb(new Error('Unsupported file type'), false);
            return;
          }
          cb(null, true);
        },
      },
    ),
  )
  async uploadBundleForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Res() res: Response,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const files = (request as any).files as
      | { document?: Express.Multer.File[]; signature?: Express.Multer.File[] }
      | undefined;

    const document = files?.document?.[0];
    const signature = files?.signature?.[0];
    if (!document || !signature) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [
          { path: ['document'], message: 'document is required' },
          { path: ['signature'], message: 'signature is required' },
        ],
      });
    }

    try {
      const created = await this.contractFiles.uploadBundleForProvider({
        actorUserId,
        requestId,
        document,
        signature,
      });
      return res.json(created);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      throw new UnprocessableEntityException({ error: msg });
    }
  }

  @Delete('pro/requests/:requestId/contract-bundles/:bundleId')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'bundleId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  deleteBundleForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('bundleId') bundleId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.deleteBundleForProvider({
      actorUserId,
      requestId,
      bundleId,
    });
  }

  @Get('requests/mine/:requestId/contract-bundles')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ContractBundleItemDto] })
  listBundlesForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listBundlesForCustomer({ actorUserId, requestId });
  }

  @Post('requests/mine/:requestId/contract-bundles/:bundleId/approve')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'bundleId', type: String })
  @ApiOkResponse({ type: OkResponseDto })
  approveBundle(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('bundleId') bundleId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.approveBundleByCustomer({
      actorUserId,
      requestId,
      bundleId,
    });
  }

  @Post('requests/mine/:requestId/contract-bundles/:bundleId/revision')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'bundleId', type: String })
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: { message: { type: 'string', minLength: 3 } },
      required: ['message'],
    },
  })
  @ApiOkResponse({ type: OkResponseDto })
  requestBundleRevision(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('bundleId') bundleId: string,
    @Body() body: unknown,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    const payload = body as { message?: unknown } | null | undefined;
    return this.contractFiles.requestBundleRevisionByCustomer({
      actorUserId,
      requestId,
      bundleId,
      message: payload?.message,
    });
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


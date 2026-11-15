import { ProviderDocumentsService } from '../provider-documents/provider-documents.service';
import {
  Body,
  HttpException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { create as contentDisposition } from 'content-disposition';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ContractFilesService } from './contract-files.service';
import { normalizeRequestAttachmentExt } from '../common/request-attachment-file';
import { OkResponseDto } from '../common/dto/ok-response.dto';
import {
  ContractFileItemDto,
  ProviderMiscFileItemDto,
  ContractFilesUploadResponseDto,
  ContractBundleItemDto,
} from './dto/contract-file-responses.dto';
import { ApiValidationErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';

const ALLOWED_SIG_EXT = new Set(['.sig', '.sgn', '.p7s']);

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
    private readonly library: ProviderDocumentsService,
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
  @ApiOkResponse({ type: [ProviderMiscFileItemDto] })
  listMiscForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listMiscForProvider({ actorUserId, requestId });
  }

  @Patch('pro/requests/:requestId/provider-misc/:fileId')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiParam({ name: 'fileId', type: String })
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: { visibleToCustomer: { type: 'boolean' } },
      required: ['visibleToCustomer'],
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        visibleToCustomer: { type: 'boolean' },
      },
      required: ['id', 'visibleToCustomer'],
    },
  })
  setMiscVisibilityForProvider(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Param('fileId') fileId: string,
    @Body() body: { visibleToCustomer?: unknown } | null,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    if (typeof body?.visibleToCustomer !== 'boolean') {
      throw new UnprocessableEntityException({
        error: 'Некорректная настройка видимости файла.',
      });
    }
    return this.contractFiles.setMiscVisibilityForProvider({
      actorUserId,
      requestId,
      fileId,
      visibleToCustomer: body.visibleToCustomer,
    });
  }

  @Post('pro/requests/:requestId/provider-misc')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBodyDoc({
    schema: {
      type: 'object',
      properties: {
        visibleToCustomer: { type: 'boolean', default: true },
        sourceDocumentIds: {
          type: 'string',
          description: 'JSON array of provider library document IDs',
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      anyOf: [{ required: ['files'] }, { required: ['sourceDocumentIds'] }],
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
        const ext = normalizeRequestAttachmentExt(
          file.originalname,
          file.mimetype,
        );
        if (!ext) {
          cb(
            new UnprocessableEntityException({
              message: 'Допустимы PDF, Word, Excel или фото в WebP.',
            }),
            false,
          );
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
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    const sourceIds: unknown = (
      request.body as { sourceDocumentIds?: unknown } | undefined
    )?.sourceDocumentIds;
    if (sourceIds !== undefined) {
      if (typeof sourceIds !== 'string')
        throw new UnprocessableEntityException(
          'Некорректный список документов.',
        );
      let ids: unknown;
      try {
        ids = JSON.parse(sourceIds);
      } catch {
        throw new UnprocessableEntityException(
          'Некорректный список документов.',
        );
      }
      if (
        !Array.isArray(ids) ||
        ids.some((id) => typeof id !== 'string') ||
        ids.length + files.length > 10
      )
        throw new UnprocessableEntityException('Выберите не более 10 файлов.');
      for (const id of new Set(ids as string[]))
        files.push(await this.library.uploadSource(actorUserId, id));
    }
    const visibility = (
      request.body as { visibleToCustomer?: unknown } | undefined
    )?.visibleToCustomer;
    if (
      visibility !== undefined &&
      visibility !== 'true' &&
      visibility !== 'false'
    ) {
      throw new UnprocessableEntityException({
        error: 'Некорректная настройка видимости файла.',
      });
    }

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
        visibleToCustomer: visibility !== 'false',
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
        const ext = normalizeRequestAttachmentExt(
          file.originalname,
          file.mimetype,
        );
        if (!ext) {
          cb(
            new UnprocessableEntityException({
              message: 'Допустимы PDF, Word, Excel или фото в WebP.',
            }),
            false,
          );
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
    const files = request.files as Express.Multer.File[] | undefined;

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
    return this.contractFiles.listBundlesForProvider({
      actorUserId,
      requestId,
    });
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
        sourceDocumentId: { type: 'string', format: 'uuid' },
        signature: { type: 'string', format: 'binary' },
      },
      oneOf: [{ required: ['document'] }, { required: ['sourceDocumentId'] }],
    },
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { bundleId: { type: 'string', format: 'uuid' } },
      required: ['bundleId'],
    },
  })
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
              ? Boolean(
                  normalizeRequestAttachmentExt(
                    file.originalname,
                    file.mimetype,
                  ),
                )
              : field === 'signature'
                ? Boolean(normalizeSigExt(file.originalname))
                : false;
          if (!ok) {
            cb(
              new UnprocessableEntityException({
                message:
                  'Допустимы PDF, Word, Excel, фото в WebP и готовые подписи .sig, .sgn или .p7s.',
              }),
              false,
            );
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
    const files = request.files as
      | { document?: Express.Multer.File[]; signature?: Express.Multer.File[] }
      | undefined;

    const sourceDocumentId: unknown = (
      request.body as { sourceDocumentId?: unknown } | undefined
    )?.sourceDocumentId;
    if (
      sourceDocumentId !== undefined &&
      (typeof sourceDocumentId !== 'string' || files?.document?.length)
    )
      throw new UnprocessableEntityException('Выберите один файл договора.');
    const document =
      typeof sourceDocumentId === 'string'
        ? await this.library.uploadSource(actorUserId, sourceDocumentId)
        : files?.document?.[0];
    const signature = files?.signature?.[0];
    if (!document) {
      throw new UnprocessableEntityException({
        error: 'Validation failed',
        issues: [{ path: ['document'], message: 'document is required' }],
      });
    }

    try {
      const created = await this.contractFiles.uploadBundleForProvider({
        operationId:
          typeof request.body?.operationId === 'string'
            ? request.body.operationId
            : undefined,
        actorUserId,
        requestId,
        document,
        signature,
      });
      return res.json(created);
    } catch (e) {
      if (e instanceof HttpException && [403, 409].includes(e.getStatus()))
        throw e;
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
    return this.contractFiles.listBundlesForCustomer({
      actorUserId,
      requestId,
    });
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

  @Get('requests/mine/:requestId/provider-misc')
  @ApiTags('contract-files')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ContractFileItemDto] })
  listMiscForCustomer(
    @Req() request: Request,
    @Param('requestId') requestId: string,
  ) {
    const actorUserId = this.getRequiredActorUserId(request);
    return this.contractFiles.listMiscForCustomer({ actorUserId, requestId });
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
    'image/webp',
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
    res.setHeader(
      'content-disposition',
      contentDisposition(fileName, { type: disposition }),
    );
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
    'image/webp',
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
    res.setHeader(
      'content-disposition',
      contentDisposition(fileName, { type: disposition }),
    );
    res.setHeader('cache-control', 'private, no-store');
    await pipeline(stream, res);
  }
}

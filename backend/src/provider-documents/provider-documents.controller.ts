import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { create as contentDisposition } from 'content-disposition';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ProviderDocumentsService } from './provider-documents.service';

@ApiTags('provider-documents')
@Controller('pro/documents')
export class ProviderDocumentsController {
  constructor(
    private readonly documents: ProviderDocumentsService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    return this.documents.list(this.auth.getUserIdFromRequest(req));
  }

  @Get('requests')
  listRequests(@Req() req: Request) {
    return this.documents.listRequests(this.auth.getUserIdFromRequest(req));
  }

  @Get('request-ids')
  requestIds(@Req() req: Request) {
    return this.documents.requestIds(this.auth.getUserIdFromRequest(req));
  }

  @Post('folders')
  createFolder(@Req() req: Request, @Body() body: { name?: unknown }) {
    return this.documents.saveFolder(
      this.auth.getUserIdFromRequest(req),
      body?.name,
    );
  }

  @Patch('folders/:id')
  renameFolder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { name?: unknown },
  ) {
    return this.documents.saveFolder(
      this.auth.getUserIdFromRequest(req),
      body?.name,
      id,
    );
  }

  @Delete('folders/:id')
  deleteFolder(@Req() req: Request, @Param('id') id: string) {
    return this.documents.deleteFolder(this.auth.getUserIdFromRequest(req), id);
  }

  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  upload(@Req() req: Request, @Body() body: { folderId?: unknown }) {
    return this.documents.upload(
      this.auth.getUserIdFromRequest(req),
      (req.files as Express.Multer.File[] | undefined) ?? [],
      body?.folderId,
    );
  }

  @Patch('files/:id')
  move(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { folderId?: unknown },
  ) {
    return this.documents.move(
      this.auth.getUserIdFromRequest(req),
      id,
      body?.folderId,
    );
  }

  @Delete('files/:id')
  delete(@Req() req: Request, @Param('id') id: string) {
    return this.documents.deleteFile(this.auth.getUserIdFromRequest(req), id);
  }

  @Get('files/:id/download')
  async download(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { file, body } = await this.documents.download(
      this.auth.getUserIdFromRequest(req),
      id,
    );
    res.setHeader('content-type', file.mimeType);
    res.setHeader(
      'content-disposition',
      contentDisposition(file.originalName, { type: 'attachment' }),
    );
    res.setHeader('cache-control', 'private, no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    await pipeline(body as NodeJS.ReadableStream, res);
  }
}

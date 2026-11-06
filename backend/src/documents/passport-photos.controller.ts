import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { PassportPhotosService } from './passport-photos.service';
import { MAX_PASSPORT_PHOTO_BYTES } from './passport-photo-storage.service';

@Controller('documents/passport/photos/mine')
export class PassportPhotosController {
  constructor(
    private readonly photos: PassportPhotosService,
    private readonly auth: InternalAuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Req() req: Request) {
    return this.photos.list(this.auth.getUserIdFromRequest(req));
  }

  @Post()
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PASSPORT_PHOTO_BYTES, files: 1, fields: 1 },
    }),
  )
  upload(
    @Req() req: Request,
    @Body('uploadId', new ParseUUIDPipe()) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = this.auth.getUserIdFromRequest(req);
    if (!file) throw new BadRequestException('Выберите фотографию');
    return this.photos.upload(userId, id, file);
  }

  @Get(':id')
  async read(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const photo = await this.photos.read(
      this.auth.getUserIdFromRequest(req),
      id,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Content-Disposition', 'inline; filename="passport-photo"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(photo.body);
  }

  @Delete(':id')
  @Header('Cache-Control', 'private, no-store')
  delete(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.photos.delete(this.auth.getUserIdFromRequest(req), id);
  }
}

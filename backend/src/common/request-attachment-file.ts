import { BadRequestException } from '@nestjs/common';
import path from 'node:path';

/** Photos arrive as WebP after the shared browser converter. */
export function normalizeRequestAttachmentExt(
  fileName: string,
  mimeType: string,
) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.webp' || mimeType.startsWith('image/')) {
    return mimeType === 'image/webp' ? '.webp' : '';
  }
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'application/msword') return '.doc';
  if (mimeType === 'application/vnd.ms-excel') return '.xls';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return '.xlsx';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return '.docx';
  return '';
}

export function validateRequestAttachment(file: Express.Multer.File) {
  const ext = normalizeRequestAttachmentExt(file.originalname, file.mimetype);
  if (!ext)
    throw new BadRequestException(
      'Допустимы PDF, Word, Excel или фото в WebP.',
    );
  if (!file.buffer?.length) throw new BadRequestException('Empty file');
  if (file.buffer.length > 20 * 1024 * 1024) {
    throw new BadRequestException('Размер файла не должен превышать 20 МБ.');
  }
  if (
    ext === '.webp' &&
    (file.buffer.length < 12 ||
      file.buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
      file.buffer.subarray(8, 12).toString('ascii') !== 'WEBP')
  )
    throw new BadRequestException('Некорректный файл WebP.');
  return ext;
}

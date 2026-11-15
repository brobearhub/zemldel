import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  normalizeRequestAttachmentExt,
  validateRequestAttachment,
} from './request-attachment-file';

describe('private request photo attachments', () => {
  it('accepts actual WebP bytes produced for photo uploads', async () => {
    const buffer = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#507050' },
    })
      .webp()
      .toBuffer();
    expect(
      validateRequestAttachment({
        originalname: 'photo.webp',
        mimetype: 'image/webp',
        buffer,
        size: buffer.length,
      } as Express.Multer.File),
    ).toBe('.webp');
  });
  it('rejects a renamed non-image masquerading as WebP', () => {
    expect(() =>
      validateRequestAttachment({
        originalname: 'photo.webp',
        mimetype: 'image/webp',
        buffer: Buffer.from('%PDF-invalid'),
        size: 12,
      } as Express.Multer.File),
    ).toThrow('Некорректный файл WebP');
  });
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.heic', 'image/heic'],
    ['photo.webp', 'application/pdf'],
  ])('rejects non-converted photo %s', (name, mime) => {
    expect(normalizeRequestAttachmentExt(name, mime)).toBe('');
  });
});

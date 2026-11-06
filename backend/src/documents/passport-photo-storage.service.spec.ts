import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { PassportPhotoStorageService } from './passport-photo-storage.service';

const service = new PassportPhotoStorageService({
  getConnection: vi.fn(),
} as never);
const file = (buffer: Buffer, mimetype = 'image/png') =>
  ({
    buffer,
    size: buffer.length,
    mimetype,
    originalname: 'private-original-name.png',
  }) as Express.Multer.File;

describe('passport photograph validation', () => {
  it('decodes an actual PNG and does not retain an original filename', async () => {
    const input = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#778899' },
    })
      .png()
      .toBuffer();
    const prepared = await service.prepare(file(input));
    expect(prepared.mimeType).toBe('image/png');
    expect(prepared.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await sharp(prepared.body).metadata()).toMatchObject({
      width: 20,
      height: 10,
      format: 'png',
    });
    expect(prepared).not.toHaveProperty('originalName');
  });
  it('removes EXIF and applies orientation before storing JPEG', async () => {
    const input = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#445566' },
    })
      .jpeg()
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Artist: 'synthetic-sensitive-metadata' } },
      })
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const prepared = await service.prepare(file(input, 'image/jpeg'));
    const result = await sharp(prepared.body).metadata();
    expect(result).toMatchObject({ width: 10, height: 20 });
    expect(result.exif).toBeUndefined();
    expect(result.orientation).toBeUndefined();
  });
  it('rejects a fake PNG and SVG despite an image MIME type', async () => {
    for (const input of [
      'not-an-image',
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
    ]) {
      await expect(
        service.prepare(file(Buffer.from(input))),
      ).rejects.toMatchObject({ status: 400 });
    }
  });
  it('rejects a MIME type that does not match the bytes', async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await expect(
      service.prepare(file(png, 'image/jpeg')),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('rejects empty and oversized uploads before decoding', async () => {
    for (const buffer of [
      Buffer.alloc(0),
      Buffer.alloc(10 * 1024 * 1024 + 1),
    ]) {
      await expect(service.prepare(file(buffer))).rejects.toMatchObject({
        status: 400,
      });
    }
  });
});

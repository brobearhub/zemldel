import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PassportStorageService } from '../storage/passport-storage.service';

export const MAX_PASSPORT_PHOTO_BYTES = 10 * 1024 * 1024;
const formats = {
  jpeg: { mimeType: 'image/jpeg', ext: 'jpg' },
  png: { mimeType: 'image/png', ext: 'png' },
  webp: { mimeType: 'image/webp', ext: 'webp' },
} as const;
export type PreparedPassportPhoto = {
  body: Buffer;
  sha256: string;
  mimeType: string;
  ext: string;
};

@Injectable()
export class PassportPhotoStorageService {
  constructor(private readonly storage: PassportStorageService) {}

  async prepare(file: Express.Multer.File): Promise<PreparedPassportPhoto> {
    if (!file.buffer?.length || file.buffer.length > MAX_PASSPORT_PHOTO_BYTES) {
      throw new BadRequestException(
        'Фото должно быть непустым и размером до 10 МБ',
      );
    }
    try {
      const bytes = file.buffer;
      const supportedSignature =
        bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        (bytes.subarray(0, 4).toString() === 'RIFF' &&
          bytes.subarray(8, 12).toString() === 'WEBP');
      if (!supportedSignature) throw new Error('Unsupported image signature');
      const image = sharp(file.buffer, {
        failOn: 'warning',
        limitInputPixels: 40_000_000,
      });
      const metadata = await image.metadata();
      const format = metadata.format;
      if (!format || !(format in formats) || (metadata.pages ?? 1) !== 1)
        throw new Error('Unsupported image');
      const spec = formats[format as keyof typeof formats];
      if (file.mimetype !== spec.mimeType)
        throw new Error('Image type mismatch');
      // Decode and re-encode; strips embedded metadata and applies EXIF orientation.
      const rotated = image.rotate();
      const body = await (
        format === 'jpeg'
          ? rotated.jpeg({ quality: 95 })
          : format === 'png'
            ? rotated.png()
            : rotated.webp({ lossless: true })
      ).toBuffer();
      if (!body.length || body.length > MAX_PASSPORT_PHOTO_BYTES)
        throw new Error('Output too large');
      return {
        body,
        sha256: createHash('sha256').update(body).digest('hex'),
        ...spec,
      };
    } catch {
      throw new BadRequestException(
        'Нужен корректный снимок JPG, PNG или WebP до 10 МБ, без анимации',
      );
    }
  }

  createKey(userId: string, ext: string) {
    return `passports/${userId}/photos/${randomUUID()}.${ext}`;
  }

  async put(key: string, photo: PreparedPassportPhoto) {
    this.assertKey(key);
    try {
      const { client, bucket, kmsKeyId } = this.storage.getConnection();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: photo.body,
          ContentType: photo.mimeType,
          CacheControl: 'private, no-store',
          ...(kmsKeyId
            ? {
                ServerSideEncryption: 'aws:kms' as const,
                SSEKMSKeyId: kmsKeyId,
              }
            : {}),
        }),
      );
    } catch {
      throw new BadGatewayException('Хранилище фотографий временно недоступно');
    }
  }

  async read(key: string, sha256: string, sizeBytes: number) {
    this.assertKey(key);
    try {
      const { client, bucket } = this.storage.getConnection();
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (
        !result.Body ||
        (result.ContentLength ?? 0) > MAX_PASSPORT_PHOTO_BYTES
      )
        throw new Error('Invalid image');
      const body = Buffer.from(await result.Body.transformToByteArray());
      if (
        body.length !== sizeBytes ||
        createHash('sha256').update(body).digest('hex') !== sha256
      )
        throw new Error('Image integrity mismatch');
      return body;
    } catch {
      throw new BadGatewayException('Не удалось прочитать фотографию');
    }
  }

  private assertKey(key: string) {
    if (
      !/^passports\/[a-f0-9-]{36}\/photos\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(
        key,
      )
    )
      throw new Error('Invalid passport photo key');
  }
}

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PassportStorageService } from '../storage/passport-storage.service';
import { eraseS3Object } from '../storage/erase-s3-object';
import { parsePassportDto, type PassportDto } from './dto/passport.dto';

const MAX_FORM_BYTES = 64 * 1024;
const digest = (body: string) =>
  createHash('sha256').update(body).digest('hex');

@Injectable()
export class PassportFormStorageService {
  constructor(private readonly storage: PassportStorageService) {}

  createKey(userId: string) {
    const key = `passports/${userId}/form/${randomUUID()}.json`;
    this.assertKey(key);
    return key;
  }

  private assertKey(key: string) {
    if (!/^passports\/[a-f0-9-]{36}\/form\/[a-f0-9-]{36}\.json$/.test(key)) {
      throw new Error('Invalid passport object key');
    }
  }

  async put(key: string, passport: PassportDto) {
    this.assertKey(key);
    const body = JSON.stringify(passport);
    if (Buffer.byteLength(body) > MAX_FORM_BYTES)
      throw new BadRequestException('Passport form too large');
    try {
      const { client, bucket, kmsKeyId } = this.storage.getConnection();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'application/json',
          CacheControl: 'private, no-store',
          ServerSideEncryption: 'aws:kms',
          SSEKMSKeyId: kmsKeyId,
        }),
      );
      return digest(body);
    } catch {
      throw new BadGatewayException('Passport storage unavailable');
    }
  }

  async read(key: string, expectedHash: string): Promise<PassportDto> {
    this.assertKey(key);
    try {
      const { client, bucket } = this.storage.getConnection();
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!result.Body || (result.ContentLength ?? 0) > MAX_FORM_BYTES)
        throw new Error('Invalid passport object');
      const body = await result.Body.transformToString();
      if (
        Buffer.byteLength(body) > MAX_FORM_BYTES ||
        digest(body) !== expectedHash
      )
        throw new Error('Invalid passport checksum');
      const { data } = parsePassportDto(JSON.parse(body) as unknown);
      if (!data) throw new Error('Invalid passport payload');
      return data;
    } catch {
      throw new BadGatewayException('Passport storage unavailable');
    }
  }

  async erase(key: string) {
    // Shared cleanup queue handles both form JSON and passport photographs.
    if (
      !/^passports\/[a-f0-9-]{36}\/(?:form\/[a-f0-9-]{36}\.json|photos\/[a-f0-9-]{36}\.(?:jpg|png|webp))$/.test(
        key,
      )
    ) {
      throw new Error('Invalid passport object key');
    }
    try {
      const { client, bucket } = this.storage.getConnection();
      await eraseS3Object(client, bucket, key);
    } catch {
      throw new BadGatewayException('Passport erasure unavailable');
    }
  }
}

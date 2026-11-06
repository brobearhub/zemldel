import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { PassportStorageService } from './passport-storage.service';
import { S3Service } from './s3.service';
import { eraseS3Object } from './erase-s3-object';

export const DOCUMENT_PREFIX = 'documents/';

/** Private request documents only. Authorization belongs to the calling service. */
@Injectable()
export class DocumentStorageService {
  constructor(
    private readonly secure: PassportStorageService,
    private readonly legacy: S3Service,
  ) {}

  isSecureKey(key: string) {
    return key.startsWith(DOCUMENT_PREFIX);
  }

  async putObject(
    input: Pick<PutObjectCommandInput, 'Key' | 'Body' | 'ContentType'>,
  ) {
    if (!input.Key || !this.isSecureKey(input.Key)) {
      throw new Error('New documents must use the private documents prefix');
    }
    const { client, bucket, kmsKeyId } = this.secure.getConnection();
    return client.send(
      new PutObjectCommand({
        ...input,
        Bucket: bucket,
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: kmsKeyId,
        CacheControl: 'private, no-store',
      }),
    );
  }

  async getObject(key: string) {
    if (this.isSecureKey(key)) {
      const { client, bucket } = this.secure.getConnection();
      // No fallback: a missing new object must never resolve to another storage.
      return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    }
    // Read compatibility only, until the explicit migration has moved old files.
    return this.legacy.client.send(
      new GetObjectCommand({
        Bucket: this.legacy.privateBucket,
        Key: key,
      }),
    );
  }

  async deleteObject(key: string) {
    try {
      await this.eraseObject(key);
    } catch (cause) {
      // A bucket-level 404 is not evidence that the document was erased.
      // Do not let callers mistake storage failures for an absent object.
      throw new Error('Document erasure failed', { cause });
    }
  }

  private async eraseObject(key: string) {
    const { client, bucket } = this.isSecureKey(key)
      ? this.secure.getConnection()
      : { client: this.legacy.client, bucket: this.legacy.privateBucket };
    await eraseS3Object(client, bucket, key);
  }
}

import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DocumentStorageService } from '../src/storage/document-storage.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { S3Service } from '../src/storage/s3.service';

async function main() {
  const connection = new PassportStorageService();
  const legacy = new S3Service();
  const storage = new DocumentStorageService(connection, legacy);
  try {
    for (const type of ['application/pdf', 'image/png']) {
      const key = `documents/_smoke/${randomUUID()}`;
      const data = Buffer.from('synthetic private document; no personal data');
      try {
        await storage.putObject({ Key: key, Body: data, ContentType: type });
        const result = await storage.getObject(key);
        assert.deepEqual(
          Buffer.from((await result.Body?.transformToByteArray()) ?? []),
          data,
        );
        assert.equal(result.ContentType, type);
        assert.equal(result.ServerSideEncryption, 'aws:kms');
        assert.equal(result.SSEKMSKeyId, connection.getConnection().kmsKeyId);
        assert.equal(result.CacheControl, 'private, no-store');
        console.log(`PASS: private encrypted ${type} write/read`);
      } finally {
        await storage.deleteObject(key);
      }
      await assert.rejects(
        storage.getObject(key),
        (error: { $metadata?: { httpStatusCode?: number } }) =>
          error.$metadata?.httpStatusCode === 404,
      );
      console.log('PASS: complete erasure confirmed');
    }
  } finally {
    connection.onModuleDestroy();
    legacy.client.destroy();
  }
}

void main().catch(() => {
  console.error(
    'Document storage check failed; SDK details omitted to protect credentials.',
  );
  process.exitCode = 1;
});

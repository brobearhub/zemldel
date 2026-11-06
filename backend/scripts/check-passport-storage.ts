import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { PassportStorageService } from '../src/storage/passport-storage.service';

// Uses only synthetic data under a unique prefix; never logs SDK errors or secrets.
async function main() {
  const storage = new PassportStorageService();
  try {
    const { client, bucket: Bucket, kmsKeyId } = storage.getConnection();
    const Key = `passports/_sdk-smoke/${randomUUID()}/probe.json`;
    const versions = async () => {
      const result = await client.send(
        new ListObjectVersionsCommand({ Bucket, Prefix: Key }),
      );
      assert(!result.IsTruncated, 'Unexpected pagination for a single probe');
      const entries = [
        ...(result.Versions ?? []),
        ...(result.DeleteMarkers ?? []),
      ].filter((entry) => entry.Key === Key);
      assert(
        entries.every((entry) => entry.VersionId),
        'Missing version ID',
      );
      return entries;
    };
    try {
      await assert.rejects(
        client.send(
          new PutObjectCommand({ Bucket, Key, Body: '{"synthetic":true}' }),
        ),
        (error: { $metadata?: { httpStatusCode?: number } }) =>
          error.$metadata?.httpStatusCode === 403,
        'Upload without KMS headers must fail',
      );
      console.log('PASS: upload without KMS headers denied');
      for (const revision of [1, 2]) {
        const Body = JSON.stringify({ synthetic: true, revision });
        await client.send(
          new PutObjectCommand({
            Bucket,
            Key,
            Body,
            ContentType: 'application/json',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: kmsKeyId,
          }),
        );
        const result = await client.send(new GetObjectCommand({ Bucket, Key }));
        assert.equal(await result.Body?.transformToString(), Body);
        assert.equal(result.ServerSideEncryption, 'aws:kms');
        assert.equal(result.SSEKMSKeyId, kmsKeyId);
        const entries = await versions();
        assert.equal(entries.length, 1);
        assert.equal(entries[0].VersionId, 'null');
      }
      console.log(
        'PASS: encrypted SDK write/read and overwrite without history',
      );
      await client.send(new DeleteObjectCommand({ Bucket, Key }));
      await assert.rejects(
        client.send(new GetObjectCommand({ Bucket, Key })),
        (error: { $metadata?: { httpStatusCode?: number } }) =>
          error.$metadata?.httpStatusCode === 404,
      );
      assert.equal((await versions()).length, 1, 'Expected null delete marker');
    } finally {
      for (const entry of await versions()) {
        await client.send(
          new DeleteObjectCommand({ Bucket, Key, VersionId: entry.VersionId }),
        );
      }
      assert.equal((await versions()).length, 0, 'Probe cleanup failed');
      console.log('PASS: test object and delete marker completely removed');
    }
  } finally {
    storage.onModuleDestroy();
  }
}

void main().catch(() => {
  console.error(
    'Passport storage check failed; credentials and SDK details omitted.',
  );
  process.exitCode = 1;
});

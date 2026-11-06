import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  GetObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';
import { PrismaService } from '../src/prisma/prisma.service';
import { InternalAuthService } from '../src/auth/internal-auth.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { PassportFormStorageService } from '../src/documents/passport-form-storage.service';

async function main() {
  assert(process.env.INTERNAL_API_SECRET);
  const db = new PrismaService();
  const connection = new PassportStorageService();
  const erasure = new PassportFormStorageService(connection);
  const users = [randomUUID(), randomUUID()];
  const port = Number(process.env.PORT ?? 3003);
  assert(Number.isInteger(port) && port > 0 && port <= 65535);
  const base = `http://127.0.0.1:${port}/documents/passport/photos/mine`;
  const auth = (userId: string) => ({
    'x-internal-auth': InternalAuthService.createTokenForUserId(
      userId,
      process.env.INTERNAL_API_SECRET!,
    ),
  });
  const png = await sharp({
    create: { width: 80, height: 50, channels: 3, background: '#8aa893' },
  })
    .png()
    .toBuffer();
  const upload = (userId: string, id: string, bytes: Buffer = png) => {
    const body = new FormData();
    body.append('uploadId', id);
    body.append(
      'file',
      new Blob([Uint8Array.from(bytes)], { type: 'image/png' }),
      'synthetic-no-personal-data.png',
    );
    return fetch(base, { method: 'POST', headers: auth(userId), body });
  };
  try {
    await db.user.createMany({
      data: users.map((id) => ({
        id,
        email: `qa-passport-photo-http-${id}@example.com`,
      })),
    });
    assert.equal((await fetch(base)).status, 401);
    assert.equal(
      (await upload(users[0], randomUUID(), Buffer.from('not a png'))).status,
      400,
    );
    assert.equal(
      (await upload(users[0], randomUUID(), Buffer.alloc(10 * 1024 * 1024 + 1)))
        .status,
      413,
    );
    const id = randomUUID();
    assert.equal((await upload(users[0], id)).status, 201);
    assert.equal((await upload(users[0], id)).status, 201);
    const list = await fetch(base, { headers: auth(users[0]) });
    assert.equal(list.headers.get('cache-control'), 'private, no-store');
    const items = (await list.json()) as { id: string }[];
    assert.equal(items.length, 1);
    assert.equal(items[0].id, id);
    assert(!('storageKey' in items[0]));
    const view = await fetch(`${base}/${id}`, { headers: auth(users[0]) });
    assert.equal(view.status, 200);
    assert.equal(view.headers.get('content-type'), 'image/png');
    assert.equal(view.headers.get('cache-control'), 'private, no-store');
    assert.equal(view.headers.get('x-content-type-options'), 'nosniff');
    const bytes = Buffer.from(await view.arrayBuffer());
    assert.equal((await sharp(bytes).metadata()).width, 80);
    const row = await db.passportPhoto.findUniqueOrThrow({ where: { id } });
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    const { client, bucket, kmsKeyId } = connection.getConnection();
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: row.storageKey }),
    );
    assert.equal(object.ServerSideEncryption, 'aws:kms');
    assert.equal(object.SSEKMSKeyId, kmsKeyId);
    await object.Body!.transformToByteArray();
    assert.equal(
      (await fetch(`${base}/${id}`, { headers: auth(users[1]) })).status,
      404,
    );
    await fetch(`${base}/${id}`, { method: 'DELETE', headers: auth(users[1]) });
    assert.equal(await db.passportPhoto.count({ where: { id } }), 1);
    console.log(
      'PASS: real HTTP image upload/read, KMS, owner isolation, invalid files, size limit and idempotent retry',
    );
    const concurrent = await Promise.all(
      Array.from({ length: 4 }, () => upload(users[0], randomUUID())),
    );
    assert.deepEqual(
      concurrent.map((response) => response.status).sort(),
      [201, 201, 201, 409],
    );
    assert.equal(
      await db.passportPhoto.count({ where: { userId: users[0] } }),
      4,
    );
    console.log('PASS: concurrent uploads cannot exceed four photos');
    assert.equal(
      (
        await fetch(`${base}/${id}`, {
          method: 'DELETE',
          headers: auth(users[0]),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/${id}`, {
          method: 'DELETE',
          headers: auth(users[0]),
        })
      ).status,
      200,
    );
    const versions = await client.send(
      new ListObjectVersionsCommand({ Bucket: bucket, Prefix: row.storageKey }),
    );
    assert.equal(
      (versions.Versions?.length ?? 0) + (versions.DeleteMarkers?.length ?? 0),
      0,
    );
    console.log('PASS: delete and retry erase all photo versions and markers');
  } finally {
    try {
      await db.user.deleteMany({ where: { id: { in: users } } });
      // All test requests have settled; remove only this run's synthetic objects.
      for (const job of await db.passportObjectCleanup.findMany({
        where: { userId: { in: users } },
      })) {
        await erasure.erase(job.objectKey);
        await db.passportObjectCleanup.deleteMany({
          where: { objectKey: job.objectKey },
        });
      }
      console.log(
        'PASS: synthetic users, photo files and cleanup jobs removed',
      );
    } finally {
      connection.onModuleDestroy();
      await db.$disconnect();
    }
  }
}

void main().catch((error: unknown) => {
  if (
    error &&
    typeof error === 'object' &&
    'actual' in error &&
    'expected' in error &&
    typeof error.actual === 'number' &&
    typeof error.expected === 'number'
  ) {
    console.error(
      `Check mismatch: actual=${error.actual}, expected=${error.expected}`,
    );
  }
  console.error(
    'Passport photo check failed; tokens and response data omitted. Start the local backend and retry.',
  );
  process.exitCode = 1;
});

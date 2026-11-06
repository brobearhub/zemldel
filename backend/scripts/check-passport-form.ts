import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  GetObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';
import { PrismaService } from '../src/prisma/prisma.service';
import { InternalAuthService } from '../src/auth/internal-auth.service';
import { DocumentsController } from '../src/documents/documents.controller';
import { DocumentsService } from '../src/documents/documents.service';
import { DocumentsCryptoService } from '../src/documents/documents-crypto.service';
import { PassportFormStorageService } from '../src/documents/passport-form-storage.service';
import { PassportStorageCleanupService } from '../src/documents/passport-storage-cleanup.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { parsePassportDto } from '../src/documents/dto/passport.dto';

async function main() {
  assert(process.env.INTERNAL_API_SECRET, 'Internal auth must be configured');
  const db = new PrismaService();
  const connection = new PassportStorageService();
  const form = new PassportFormStorageService(connection);
  const cleanup = new PassportStorageCleanupService(db, form);
  const documents = new DocumentsService(
    db,
    {} as never,
    new DocumentsCryptoService(),
    form,
    cleanup,
  );
  const users = [randomUUID(), randomUUID()];
  let app: INestApplication | undefined;
  try {
    await db.user.createMany({
      data: users.map((id) => ({
        id,
        email: `qa-passport-http-${id}@example.com`,
      })),
    });
    class SmokeModule {}
    Module({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: documents },
        InternalAuthService,
      ],
    })(SmokeModule);
    // tsx does not emit design:paramtypes; supply the controller's actual tokens.
    Reflect.defineMetadata(
      'design:paramtypes',
      [DocumentsService, InternalAuthService],
      DocumentsController,
    );
    app = await NestFactory.create(SmokeModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const url = `${await app.getUrl()}/documents/passport/mine`;
    const token = (id: string) =>
      InternalAuthService.createTokenForUserId(
        id,
        process.env.INTERNAL_API_SECRET!,
      );
    const request = (method: string, id?: string, body?: unknown) =>
      fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(id ? { 'x-internal-auth': token(id) } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const passport = parsePassportDto({
      series: '0000',
      number: '000001',
      fullName: 'SYNTHETIC TEST DATA',
    }).data!;
    assert.equal((await request('GET')).status, 401);
    assert.equal((await request('PUT', users[0], passport)).status, 200);
    const first = await db.passportDocument.findUniqueOrThrow({
      where: { userId: users[0] },
    });
    assert(first.storageKey && first.sha256);
    assert.equal(first.ciphertext, null);
    assert.equal(first.iv, null);
    assert.equal(first.tag, null);
    const mine = await request('GET', users[0]);
    assert.equal(mine.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await mine.json(), passport);
    const other = await request('GET', users[1]);
    assert.equal(other.status, 200);
    assert(['', 'null'].includes((await other.text()).trim()));
    console.log(
      'PASS: HTTP save/read, authentication, owner isolation, and no database passport payload',
    );

    const { client, bucket, kmsKeyId } = connection.getConnection();
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: first.storageKey }),
    );
    assert.equal(object.ContentType, 'application/json');
    assert.equal(object.ServerSideEncryption, 'aws:kms');
    assert.equal(object.SSEKMSKeyId, kmsKeyId);
    assert.deepEqual(
      JSON.parse(await object.Body!.transformToString()),
      passport,
    );
    const replacement = { ...passport, number: '000002' };
    assert.equal((await request('PUT', users[0], replacement)).status, 200);
    assert.deepEqual(
      await (await request('GET', users[0])).json(),
      replacement,
    );
    const old = await client.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: first.storageKey,
      }),
    );
    assert.equal(
      (old.Versions?.length ?? 0) + (old.DeleteMarkers?.length ?? 0),
      0,
    );
    assert.equal(
      (await request('PUT', users[0], { ...passport, number: 'invalid' }))
        .status,
      422,
    );
    assert.deepEqual(
      await (await request('GET', users[0])).json(),
      replacement,
    );
    console.log(
      'PASS: actual encrypted JSON, replacement erasure, invalid form leaves saved data intact',
    );

    assert.equal((await request('DELETE', users[0])).status, 200);
    assert.equal(
      await db.passportDocument.count({ where: { userId: users[0] } }),
      0,
    );
    const remaining = await client.send(
      new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: `passports/${users[0]}/`,
      }),
    );
    assert.equal(
      (remaining.Versions?.length ?? 0) +
        (remaining.DeleteMarkers?.length ?? 0),
      0,
    );
    console.log(
      'PASS: HTTP deletion removes stored JSON and all versions/markers',
    );
  } finally {
    await app?.close();
    try {
      await db.user.deleteMany({ where: { id: { in: users } } });
      for (const id of users) await cleanup.flushUser(id);
      assert.equal(
        await db.passportObjectCleanup.count({
          where: { userId: { in: users } },
        }),
        0,
      );
      console.log(
        'PASS: synthetic users, passport objects and cleanup jobs removed',
      );
    } finally {
      connection.onModuleDestroy();
      await db.$disconnect();
    }
  }
}

void main().catch(() => {
  console.error(
    'Passport HTTP/storage check failed; credentials and response data omitted.',
  );
  process.exitCode = 1;
});

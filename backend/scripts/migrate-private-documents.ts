import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { DocumentStorageService } from '../src/storage/document-storage.service';
import { PassportStorageService } from '../src/storage/passport-storage.service';
import { S3Service } from '../src/storage/s3.service';

const tables = [
  'RequestContractFile',
  'RequestDocumentRequest',
  'RequestWorkStageFile',
  'RequestWorkStageDocSlot',
] as const;
type Table = (typeof tables)[number];
type Row = {
  id: string;
  storageRelPath: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
};
type Entry = Row & {
  table: Table;
  target: string;
  state: 'pending' | 'switched' | 'cleaned';
};
type Journal = { bucket: string; entries: Entry[] };
const hash = (body: Uint8Array) =>
  createHash('sha256').update(body).digest('hex');

export async function migratePrivateDocuments(args: string[]) {
  assert(
    args.every(
      (arg) =>
        arg === '--apply' ||
        arg === '--cleanup' ||
        arg.startsWith('--journal='),
    ),
    'Unknown option',
  );
  assert(
    !(args.includes('--apply') && args.includes('--cleanup')),
    'Use one migration mode at a time',
  );
  const apply = args.includes('--apply');
  const cleanup = args.includes('--cleanup');
  const journalPath = args
    .find((arg) => arg.startsWith('--journal='))
    ?.slice('--journal='.length);
  if (apply || cleanup)
    assert(
      journalPath && path.isAbsolute(journalPath),
      'An absolute --journal path is required',
    );
  const db = new PrismaService();
  let secure: PassportStorageService | undefined;
  let legacy: S3Service | undefined;
  try {
    if (!apply && !cleanup) {
      for (const table of tables) {
        const [row] = await db.$queryRaw<
          { total: bigint; legacy: bigint }[]
        >(Prisma.sql`
          SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "storageRelPath" NOT LIKE 'documents/%') AS legacy
          FROM ${Prisma.raw(`"${table}"`)} WHERE "storageRelPath" IS NOT NULL
        `);
        console.log(
          `${table}: total=${row.total}, awaiting_migration=${row.legacy}`,
        );
      }
      console.log(
        'Read-only inventory complete. No files or database rows changed.',
      );
      return;
    }
    secure = new PassportStorageService();
    legacy = new S3Service();
    const storage = new DocumentStorageService(secure, legacy);
    const bucket = secure.getConnection().bucket;
    let journal: Journal;
    try {
      journal = JSON.parse(await readFile(journalPath!, 'utf8')) as Journal;
      await chmod(journalPath!, 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || cleanup)
        throw error;
      journal = { bucket, entries: [] };
      for (const table of tables) {
        const rows = await db.$queryRaw<Row[]>(Prisma.sql`
          SELECT id, "storageRelPath", sha256, "sizeBytes", "mimeType"
          FROM ${Prisma.raw(`"${table}"`)}
          WHERE "storageRelPath" IS NOT NULL AND "storageRelPath" NOT LIKE 'documents/%'
        `);
        journal.entries.push(
          ...rows.map((row) => ({
            ...row,
            table,
            target: `documents/migrated/${randomUUID()}`,
            state: 'pending' as const,
          })),
        );
      }
      // A durable journal precedes all cloud writes, including retryable partial copies.
      await writeFile(journalPath!, JSON.stringify(journal), {
        flag: 'wx',
        mode: 0o600,
      });
    }
    assert.equal(journal.bucket, bucket, 'Journal belongs to another bucket');
    assert(Array.isArray(journal.entries), 'Invalid migration journal');
    for (const entry of journal.entries) {
      assert(tables.includes(entry.table), 'Invalid journal table');
      assert(!storage.isSecureKey(entry.storageRelPath), 'Invalid source key');
      assert(
        /^documents\/migrated\/[0-9a-f-]{36}$/.test(entry.target),
        'Invalid target key',
      );
      assert(
        entry.sha256 && /^[a-f0-9]{64}$/i.test(entry.sha256),
        'Missing source checksum',
      );
    }
    const save = async () => {
      const temporary = `${journalPath}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(journal), {
        flag: 'wx',
        mode: 0o600,
      });
      await rename(temporary, journalPath!);
    };
    const verify = (body: Uint8Array, entry: Entry) => {
      assert.equal(body.length, entry.sizeBytes, 'Document size mismatch');
      assert.equal(
        hash(body),
        entry.sha256.toLowerCase(),
        'Document checksum mismatch',
      );
    };
    const readStored = async (key: string) => {
      const result = await storage.getObject(key);
      assert(result.Body, 'Missing document body');
      return result.Body.transformToByteArray();
    };
    const localPath = async (entry: Entry) => {
      assert.equal(
        entry.table,
        'RequestContractFile',
        'Local fallback is restricted to legacy contracts',
      );
      const base = await realpath(
        process.env.CONTRACT_FILES_DIR ?? path.resolve('storage', 'contracts'),
      );
      const absolute = await realpath(path.resolve(base, entry.storageRelPath));
      const relative = path.relative(base, absolute);
      assert(
        relative && !relative.startsWith('..') && !path.isAbsolute(relative),
        'Unsafe legacy path',
      );
      return absolute;
    };
    for (const entry of journal.entries) {
      if (entry.state === 'cleaned') continue;
      const [current] = await db.$queryRaw<
        { storageRelPath: string }[]
      >(Prisma.sql`
        SELECT "storageRelPath" FROM ${Prisma.raw(`"${entry.table}"`)} WHERE id = ${entry.id}::uuid
      `);
      assert(current, 'Source record changed; manual reconciliation required');
      if (apply) {
        if (current.storageRelPath === entry.target) {
          verify(await readStored(entry.target), entry);
        } else {
          assert.equal(
            current.storageRelPath,
            entry.storageRelPath,
            'Source reference changed',
          );
          let bytes: Uint8Array;
          try {
            bytes = await readStored(entry.storageRelPath);
          } catch (error) {
            const e = error as { $metadata?: { httpStatusCode?: number } };
            if (
              e.$metadata?.httpStatusCode !== 404 ||
              entry.table !== 'RequestContractFile'
            )
              throw error;
            bytes = await readFile(await localPath(entry));
          }
          verify(bytes, entry);
          await storage.putObject({
            Key: entry.target,
            Body: bytes,
            ContentType: entry.mimeType,
          });
          verify(await readStored(entry.target), entry);
          const updated = await db.$executeRaw(Prisma.sql`
            UPDATE ${Prisma.raw(`"${entry.table}"`)} SET "storageRelPath" = ${entry.target}
            WHERE id = ${entry.id}::uuid AND "storageRelPath" = ${entry.storageRelPath}
              AND sha256 = ${entry.sha256} AND "sizeBytes" = ${entry.sizeBytes}
          `);
          assert.equal(
            updated,
            1,
            'Concurrent document change; copy retained for reconciliation',
          );
        }
        entry.state = 'switched';
      } else {
        assert.equal(
          entry.state,
          'switched',
          'Complete copying before cleanup',
        );
        assert.equal(
          current.storageRelPath,
          entry.target,
          'Destination reference changed',
        );
        verify(await readStored(entry.target), entry);
        for (const table of tables) {
          const [count] = await db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
            SELECT COUNT(*) AS count FROM ${Prisma.raw(`"${table}"`)} WHERE "storageRelPath" = ${entry.storageRelPath}
          `);
          assert.equal(count.count, 0n, 'Legacy source is still referenced');
        }
        await storage.deleteObject(entry.storageRelPath);
        if (entry.table === 'RequestContractFile') {
          let absolute: string | undefined;
          try {
            absolute = await localPath(entry);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          if (absolute) {
            verify(await readFile(absolute), entry);
            await unlink(absolute);
          }
        }
        entry.state = 'cleaned';
      }
      await save();
      console.log(
        `Progress: ${journal.entries.filter((row) => row.state === (cleanup ? 'cleaned' : 'switched')).length}/${journal.entries.length}`,
      );
    }
    console.log(
      cleanup
        ? 'Legacy object cleanup complete.'
        : 'Verified copies linked. Legacy originals retained until --cleanup.',
    );
  } finally {
    secure?.onModuleDestroy();
    legacy?.client.destroy();
    await db.$disconnect();
  }
}

if (require.main === module)
  void migratePrivateDocuments(process.argv.slice(2)).catch(() => {
    console.error(
      'Migration stopped. No credentials or document identifiers printed; inspect the protected journal before retrying.',
    );
    process.exitCode = 1;
  });

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const state = vi.hoisted(() => ({
  query: vi.fn(),
  update: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class {
    $queryRaw = state.query;
    $executeRaw = state.update;
    $disconnect = vi.fn();
  },
}));
vi.mock('../src/storage/passport-storage.service', () => ({
  PassportStorageService: class {
    getConnection() {
      return { bucket: 'test-private-bucket' };
    }
    onModuleDestroy() {}
  },
}));
vi.mock('../src/storage/s3.service', () => ({
  S3Service: class {
    client = { destroy() {} };
  },
}));
vi.mock('../src/storage/document-storage.service', () => ({
  DocumentStorageService: class {
    isSecureKey(key: string) {
      return key.startsWith('documents/');
    }
    getObject = state.get;
    putObject = state.put;
    deleteObject = state.remove;
  },
}));
import { migratePrivateDocuments } from './migrate-private-documents';

describe('private document migration', () => {
  let directory: string;
  let journal: string;
  let current: string;
  let objects: Map<string, Uint8Array>;
  const bytes = Buffer.from('synthetic migration document');
  const row = {
    id: '00000000-0000-4000-8000-000000000001',
    storageRelPath: 'private/legacy',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sizeBytes: bytes.length,
    mimeType: 'application/pdf',
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    directory = await mkdtemp(path.join(os.tmpdir(), 'document-migration-'));
    journal = path.join(directory, 'journal.json');
    current = row.storageRelPath;
    objects = new Map([[current, bytes]]);
    state.query.mockImplementation((sql: { strings: string[] }) => {
      const text = sql.strings.join('');
      if (text.includes('COUNT'))
        return [
          {
            count: current === row.storageRelPath ? 1n : 0n,
            total: 1n,
            legacy: 1n,
          },
        ];
      if (text.includes('SELECT id,'))
        return text.includes('RequestContractFile') ? [row] : [];
      return [{ storageRelPath: current }];
    });
    state.update.mockImplementation((sql: { values: unknown[] }) => {
      current = sql.values[0] as string;
      return 1;
    });
    state.get.mockImplementation((key: string) => ({
      Body: { transformToByteArray: () => objects.get(key) },
    }));
    state.put.mockImplementation(
      ({ Key, Body }: { Key: string; Body: Uint8Array }) => {
        objects.set(Key, Body);
      },
    );
    state.remove.mockImplementation((key: string) => {
      objects.delete(key);
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it('keeps the inventory read-only', async () => {
    await migratePrivateDocuments([]);
    expect(state.put).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('verifies a copied file before switching its reference, resumes, and cleans up separately', async () => {
    await migratePrivateDocuments(['--apply', `--journal=${journal}`]);
    expect(current).toMatch(/^documents\/migrated\//);
    expect(objects.has(row.storageRelPath)).toBe(true);
    expect(state.remove).not.toHaveBeenCalled();
    const saved = JSON.parse(await readFile(journal, 'utf8'));
    expect(saved.entries[0].state).toBe('switched');
    await migratePrivateDocuments(['--apply', `--journal=${journal}`]);
    expect(state.put).toHaveBeenCalledTimes(1);
    await migratePrivateDocuments(['--cleanup', `--journal=${journal}`]);
    expect(objects.has(row.storageRelPath)).toBe(false);
    expect(objects.has(current)).toBe(true);
  });

  it('does not copy or switch a source with an incorrect checksum', async () => {
    objects.set(row.storageRelPath, Buffer.alloc(bytes.length));
    await expect(
      migratePrivateDocuments(['--apply', `--journal=${journal}`]),
    ).rejects.toThrow('checksum mismatch');
    expect(state.put).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });

  it('does not switch references or delete originals when destination verification fails', async () => {
    state.put.mockImplementation(({ Key }: { Key: string }) => {
      objects.set(Key, Buffer.alloc(bytes.length));
    });
    await expect(
      migratePrivateDocuments(['--apply', `--journal=${journal}`]),
    ).rejects.toThrow('checksum mismatch');
    expect(state.update).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
  });

  it('retains the source and journal when a concurrent write changes the row', async () => {
    state.update.mockResolvedValue(0);
    await expect(
      migratePrivateDocuments(['--apply', `--journal=${journal}`]),
    ).rejects.toThrow('Concurrent document change');
    expect(state.remove).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(journal, 'utf8')).entries[0].state).toBe(
      'pending',
    );
  });
});

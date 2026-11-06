import { describe, expect, it, vi } from 'vitest';
import type { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { PassportStorageService } from '../src/storage/passport-storage.service';
import { checkPrivateDocumentHealth } from './private-document-health';

describe('private document health reporting', () => {
  function setup(overdue = 0) {
    const query = vi
      .fn()
      .mockResolvedValue([
        { pending: overdue, overdue, oldestOverdueSeconds: overdue ? 1000 : 0 },
      ]);
    const send = vi
      .fn<(command: ListObjectsV2Command) => Promise<object>>()
      .mockResolvedValue({
        Contents: [{ Key: 'private-sensitive-object-name' }],
      });
    const prisma = { $queryRaw: query } as unknown as PrismaService;
    const storage = {
      getConnection: () => ({ client: { send }, bucket: 'test-private' }),
    } as unknown as PassportStorageService;
    return { prisma, storage, query, send };
  }

  it('checks both private prefixes without returning object names', async () => {
    const s = setup();
    const report = await checkPrivateDocumentHealth(s.prisma, s.storage);
    expect(report.ok).toBe(true);
    expect(s.send.mock.calls.map(([command]) => command.input.Prefix)).toEqual([
      'passports/',
      'documents/',
    ]);
    expect(JSON.stringify(report)).not.toContain('private-sensitive');
  });

  it('reports storage failure even when the queue is empty', async () => {
    const s = setup();
    s.send.mockRejectedValue(new Error('secret-in-sdk-error'));
    const report = await checkPrivateDocumentHealth(s.prisma, s.storage);
    expect(report.ok).toBe(false);
    expect(report.storageReachable).toBe(false);
    expect(report.cleanup).not.toBeNull();
    expect(JSON.stringify(report)).not.toContain('secret');
  });

  it('does not interpret an unavailable DB as an empty queue', async () => {
    const s = setup();
    s.query.mockRejectedValue(new Error('secret-in-db-error'));
    const report = await checkPrivateDocumentHealth(s.prisma, s.storage);
    expect(report.ok).toBe(false);
    expect(report.cleanup).toBeNull();
    expect(report.storageReachable).toBe(true);
    expect(JSON.stringify(report)).not.toContain('secret');
  });

  it('reports overdue cleanup as a failure despite reachable storage', async () => {
    const s = setup(2);
    const report = await checkPrivateDocumentHealth(s.prisma, s.storage);
    expect(report.ok).toBe(false);
    expect(report.cleanup?.overdue).toBe(2);
  });
});

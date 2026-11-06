import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { PassportPhotosService } from './passport-photos.service';
import { PassportStorageCleanupService } from './passport-storage-cleanup.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'passport photographs on real PostgreSQL',
  () => {
    const users: string[] = [];
    const stored = new Set<string>();
    const storage = {
      prepare: vi.fn().mockResolvedValue({
        body: Buffer.from('synthetic'),
        sha256: 'a'.repeat(64),
        mimeType: 'image/png',
        ext: 'png',
      }),
      createKey: (id: string) => `passports/${id}/photos/${randomUUID()}.png`,
      put: vi.fn(),
      read: vi.fn().mockResolvedValue(Buffer.from('synthetic')),
    };
    let db: PrismaService;
    let service: PassportPhotosService;
    let cleanup: PassportStorageCleanupService;
    let owner: string;
    beforeAll(() => {
      db = new PrismaService();
      cleanup = new PassportStorageCleanupService(db, {
        erase: (key: string) => {
          stored.delete(key);
        },
      } as never);
      service = new PassportPhotosService(
        db,
        storage as never,
        cleanup,
        {} as never,
      );
    });
    beforeEach(async () => {
      owner = randomUUID();
      users.push(owner);
      await db.user.create({
        data: { id: owner, email: `qa-photo-${owner}@example.com` },
      });
      storage.put.mockReset().mockImplementation((key: string) => {
        stored.add(key);
      });
    });
    afterAll(async () => {
      for (const id of users) {
        await db.user.deleteMany({ where: { id } });
        await cleanup.flushUser(id);
        // Test objects are in memory; clean failed-upload bookkeeping for these users only.
        await db.passportObjectCleanup.deleteMany({ where: { userId: id } });
      }
      await db.$disconnect();
    });

    it('persists metadata and treats retries with the same upload ID as one photo', async () => {
      const id = randomUUID();
      const first = await service.upload(owner, id, {} as never);
      expect(await service.upload(owner, id, {} as never)).toEqual(first);
      expect(storage.put).toHaveBeenCalledTimes(1);
      expect(await service.list(owner)).toHaveLength(1);
      expect(first).not.toHaveProperty('storageKey');
      expect(first).not.toHaveProperty('sha256');
    });
    it('keeps the four-photo limit under five concurrent uploads', async () => {
      const result = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          service.upload(owner, randomUUID(), {} as never),
        ),
      );
      expect(result.filter((row) => row.status === 'fulfilled')).toHaveLength(
        4,
      );
      expect(await db.passportPhoto.count({ where: { userId: owner } })).toBe(
        4,
      );
    });
    it('cannot read or delete another owner photo', async () => {
      const id = randomUUID();
      await service.upload(owner, id, {} as never);
      const stranger = randomUUID();
      expect(await service.list(stranger)).toEqual([]);
      await expect(service.read(stranger, id)).rejects.toMatchObject({
        status: 404,
      });
      await service.delete(stranger, id);
      expect(
        await db.passportPhoto.count({ where: { id, userId: owner } }),
      ).toBe(1);
    });
    it('deletes the S3 object and allows repeated DELETE', async () => {
      const id = randomUUID();
      await service.upload(owner, id, {} as never);
      const photo = await db.passportPhoto.findUniqueOrThrow({ where: { id } });
      await service.delete(owner, id);
      await service.delete(owner, id);
      expect(stored.has(photo.storageKey)).toBe(false);
      expect(
        await db.passportObjectCleanup.count({
          where: { userId: owner, reason: 'DELETE' },
        }),
      ).toBe(0);
    });
    it('retains failed upload cleanup and handles account-deletion cascades', async () => {
      storage.put.mockRejectedValueOnce(new Error('storage offline'));
      await expect(
        service.upload(owner, randomUUID(), {} as never),
      ).rejects.toThrow('storage offline');
      expect(
        await db.passportObjectCleanup.count({
          where: { userId: owner, reason: 'UNCOMMITTED_UPLOAD' },
        }),
      ).toBe(1);
      const id = randomUUID();
      await service.upload(owner, id, {} as never);
      const photo = await db.passportPhoto.findUniqueOrThrow({ where: { id } });
      await db.user.delete({ where: { id: owner } });
      await cleanup.flushUser(owner);
      expect(stored.has(photo.storageKey)).toBe(false);
    });
  },
);

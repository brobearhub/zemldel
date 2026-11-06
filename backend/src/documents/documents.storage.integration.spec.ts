import 'dotenv/config';
import { randomUUID, createHash } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from './documents.service';
import { DocumentsCryptoService } from './documents-crypto.service';
import { PassportStorageCleanupService } from './passport-storage-cleanup.service';
import { parsePassportDto, type PassportDto } from './dto/passport.dto';

describe.skipIf(!process.env.DATABASE_URL)(
  'passport storage with real database transactions',
  () => {
    const users: string[] = [];
    const objects = new Map<string, PassportDto>();
    const storage = {
      createKey: (id: string) => `passports/${id}/form/${randomUUID()}.json`,
      put: vi.fn(),
      read: vi.fn(),
      erase: vi.fn(),
    };
    const passport = parsePassportDto({
      series: '0000',
      number: '000001',
    }).data!;
    let db: PrismaService;
    let service: DocumentsService;
    let crypto: DocumentsCryptoService;
    let cleanup: PassportStorageCleanupService;
    let userId: string;
    beforeAll(() => {
      vi.stubEnv(
        'DOCUMENTS_MASTER_KEY_V1_BASE64',
        Buffer.alloc(32, 3).toString('base64'),
      );
      db = new PrismaService();
      crypto = new DocumentsCryptoService();
      cleanup = new PassportStorageCleanupService(db, storage as never);
      service = new DocumentsService(
        db,
        {} as never,
        crypto,
        storage as never,
        cleanup,
      );
    });
    beforeEach(async () => {
      userId = randomUUID();
      users.push(userId);
      await db.user.create({
        data: { id: userId, email: `qa-passport-${userId}@example.com` },
      });
      storage.put
        .mockReset()
        .mockImplementation((key: string, data: PassportDto) => {
          objects.set(key, data);
          return createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
        });
      storage.read
        .mockReset()
        .mockImplementation((key: string) => objects.get(key));
      storage.erase.mockReset().mockImplementation((key: string) => {
        objects.delete(key);
      });
    });
    afterAll(async () => {
      for (const id of users) {
        await db.passportDocument.deleteMany({ where: { userId: id } });
        await cleanup.flushUser(id);
        await db.passportObjectCleanup.deleteMany({ where: { userId: id } });
        await db.user.deleteMany({ where: { id } });
      }
      await db.$disconnect();
      vi.unstubAllEnvs();
    });

    it('stores only a pointer and digest, reads JSON and erases the superseded file', async () => {
      await service.upsertMyPassport({ actorUserId: userId, passport });
      const first = await db.passportDocument.findUniqueOrThrow({
        where: { userId },
      });
      expect(first).toMatchObject({
        alg: null,
        keyVersion: null,
        iv: null,
        tag: null,
        ciphertext: null,
      });
      expect(first.storageKey).toMatch(/^passports\//);
      expect(await service.getMyPassport(userId)).toEqual(passport);
      await service.upsertMyPassport({
        actorUserId: userId,
        passport: { ...passport, number: '000002' },
      });
      expect(objects.has(first.storageKey!)).toBe(false);
      expect(await db.passportObjectCleanup.count({ where: { userId } })).toBe(
        0,
      );
    });

    it('keeps a failed upload discoverable and never changes the saved reference', async () => {
      await service.upsertMyPassport({ actorUserId: userId, passport });
      const first = await db.passportDocument.findUniqueOrThrow({
        where: { userId },
      });
      storage.put.mockImplementationOnce((key: string, data: PassportDto) => {
        objects.set(key, data);
        throw new Error('response lost after upload');
      });
      await expect(
        service.upsertMyPassport({ actorUserId: userId, passport }),
      ).rejects.toThrow('response lost');
      expect(
        (await db.passportDocument.findUniqueOrThrow({ where: { userId } }))
          .storageKey,
      ).toBe(first.storageKey);
      const pending = await db.passportObjectCleanup.findFirstOrThrow({
        where: { userId },
      });
      expect(pending.reason).toBe('UNCOMMITTED_UPLOAD');
      await db.passportObjectCleanup.update({
        where: { objectKey: pending.objectKey },
        data: { notBefore: new Date(0) },
      });
      await cleanup.runDue(userId);
      expect(objects.has(pending.objectKey)).toBe(false);
      expect(objects.has(first.storageKey!)).toBe(true);
    });

    it('serializes parallel saves and leaves only the current object', async () => {
      await Promise.all([
        service.upsertMyPassport({ actorUserId: userId, passport }),
        service.upsertMyPassport({
          actorUserId: userId,
          passport: { ...passport, number: '000002' },
        }),
      ]);
      const row = await db.passportDocument.findUniqueOrThrow({
        where: { userId },
      });
      expect(
        [...objects.keys()].filter((key) =>
          key.startsWith(`passports/${userId}/`),
        ),
      ).toEqual([row.storageKey]);
      expect(await db.passportObjectCleanup.count({ where: { userId } })).toBe(
        0,
      );
    });

    it('retains a deletion job after storage failure and succeeds on retry', async () => {
      await service.upsertMyPassport({ actorUserId: userId, passport });
      storage.erase.mockRejectedValueOnce(new Error('storage unavailable'));
      await expect(
        service.deleteMyPassport({ actorUserId: userId }),
      ).rejects.toThrow('storage unavailable');
      expect(await db.passportDocument.count({ where: { userId } })).toBe(0);
      expect(
        await db.passportObjectCleanup.count({
          where: { userId, reason: 'DELETE' },
        }),
      ).toBe(1);
      await service.deleteMyPassport({ actorUserId: userId });
      expect(await db.passportObjectCleanup.count({ where: { userId } })).toBe(
        0,
      );
    });

    it('reads legacy encryption and clears database payloads on the next save', async () => {
      const encrypted = crypto.encryptJson(passport);
      await db.passportDocument.create({
        data: {
          userId,
          ...encrypted,
          iv: Uint8Array.from(encrypted.iv),
          tag: Uint8Array.from(encrypted.tag),
          ciphertext: Uint8Array.from(encrypted.ciphertext),
        },
      });
      expect(await service.getMyPassport(userId)).toEqual(passport);
      await service.upsertMyPassport({ actorUserId: userId, passport });
      expect(
        (await db.passportDocument.findUniqueOrThrow({ where: { userId } }))
          .ciphertext,
      ).toBeNull();
    });

    it('queues erasure when an account is deleted through a database cascade', async () => {
      await service.upsertMyPassport({ actorUserId: userId, passport });
      const row = await db.passportDocument.findUniqueOrThrow({
        where: { userId },
      });
      await db.user.delete({ where: { id: userId } });
      expect(
        await db.passportObjectCleanup.count({
          where: { userId, reason: 'DELETE' },
        }),
      ).toBe(1);
      await cleanup.flushUser(userId);
      expect(objects.has(row.storageKey!)).toBe(false);
    });
    it('defers failed background erasure but permits immediate explicit retry', async () => {
      const objectKey = storage.createKey(userId);
      objects.set(objectKey, passport);
      await db.passportObjectCleanup.create({ data: { objectKey, userId } });
      storage.erase.mockRejectedValueOnce(
        new Error('temporary storage failure'),
      );
      await cleanup.runDue(userId);
      const job = await db.passportObjectCleanup.findUniqueOrThrow({
        where: { objectKey },
      });
      expect(job.notBefore.getTime()).toBeGreaterThan(Date.now());
      await cleanup.flushUser(userId);
      expect(objects.has(objectKey)).toBe(false);
      expect(await db.passportObjectCleanup.count({ where: { userId } })).toBe(
        0,
      );
    });
  },
);

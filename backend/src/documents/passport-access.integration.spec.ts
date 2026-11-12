import 'dotenv/config';
import { randomUUID } from 'node:crypto';
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
import { PassportAccessService } from './passport-access.service';
import { DocumentsService } from './documents.service';
import { PassportPhotosService } from './passport-photos.service';

describe.skipIf(!process.env.DATABASE_URL)(
  'explicit passport permissions',
  () => {
    const providerId = randomUUID(),
      otherProvider = randomUUID(),
      actor = randomUUID();
    const customers: string[] = [];
    let db: PrismaService,
      access: PassportAccessService,
      documents: DocumentsService,
      photos: PassportPhotosService;
    let userId: string, requestId: string, photoId: string;
    const form = { series: '0000', number: '000001' };
    const formRead = vi.fn(() => Promise.resolve(form));
    const photoRead = vi.fn(() => Promise.resolve(Buffer.from('synthetic')));
    const grant = (form: boolean, photo: boolean) =>
      access.save(userId, requestId, { form, photo, durationDays: 7 });
    const readForm = () =>
      documents.getPassportForProviderByOrder({
        actorUserId: actor,
        requestId,
      });
    const readPhoto = () => photos.readForProvider(actor, requestId, photoId);
    beforeAll(async () => {
      db = new PrismaService();
      await db.user.create({
        data: { id: actor, email: `qa-grants-${actor}@example.com` },
      });
      for (const id of [providerId, otherProvider])
        await db.provider.create({
          data: {
            id,
            name: 'Grant QA',
            slug: `qa-grants-${id}`,
            type: 'SELF_EMPLOYED',
          },
        });
      access = new PassportAccessService(db, {
        getOrderManagementContext: (id: string) =>
          Promise.resolve({
            isPlatformAdmin: id === 'admin',
            providerId: id === actor ? providerId : otherProvider,
          }),
      } as never);
      documents = new DocumentsService(
        db,
        access,
        {} as never,
        { read: formRead } as never,
        { flushUser: vi.fn() } as never,
      );
      photos = new PassportPhotosService(
        db,
        { read: photoRead } as never,
        { flushUser: vi.fn() } as never,
        access,
      );
    });
    beforeEach(async () => {
      userId = randomUUID();
      customers.push(userId);
      requestId = randomUUID();
      photoId = randomUUID();
      await db.user.create({
        data: { id: userId, email: `qa-grants-${userId}@example.com` },
      });
      await db.request.create({
        data: {
          id: requestId,
          customerUserId: userId,
          providerId,
          status: 'ACTIVE',
        },
      });
      await db.passportDocument.create({
        data: {
          userId,
          storageKey: `passports/${userId}/form/${randomUUID()}.json`,
          sha256: 'a'.repeat(64),
        },
      });
      await db.passportPhoto.create({
        data: {
          id: photoId,
          userId,
          storageKey: `passports/${userId}/photos/${randomUUID()}.png`,
          sha256: 'a'.repeat(64),
          mimeType: 'image/png',
          sizeBytes: 9,
        },
      });
      formRead.mockClear();
      photoRead.mockClear();
    });
    afterAll(async () => {
      await db.request.deleteMany({
        where: { customerUserId: { in: customers } },
      });
      await db.user.deleteMany({
        where: { id: { in: [...customers, actor] } },
      });
      await db.passportObjectCleanup.deleteMany({
        where: { userId: { in: customers } },
      });
      await db.provider.deleteMany({
        where: { id: { in: [providerId, otherProvider] } },
      });
      await db.$disconnect();
    });
    it('denies implicit access and checks form/photo independently, with audit', async () => {
      await expect(readForm()).rejects.toMatchObject({ status: 403 });
      await expect(readPhoto()).rejects.toMatchObject({ status: 403 });
      expect(formRead).not.toHaveBeenCalled();
      expect(photoRead).not.toHaveBeenCalled();
      await grant(true, false);
      expect(await readForm()).toEqual(form);
      await expect(readPhoto()).rejects.toMatchObject({ status: 403 });
      await grant(false, true);
      await expect(readForm()).rejects.toMatchObject({ status: 403 });
      expect((await readPhoto()).body.toString()).toBe('synthetic');
      expect((await access.mine(userId)).audit.map((e) => e.action)).toEqual(
        expect.arrayContaining([
          'GRANT_FORM',
          'REVOKE_FORM',
          'GRANT_PHOTO',
          'PROVIDER_FORM_READ',
          'PROVIDER_PHOTO_READ',
        ]),
      );
    });
    it('keeps concurrent repeated requests idempotent and never grants access', async () => {
      await Promise.all(
        Array.from({ length: 3 }, () =>
          access.requestAccess(actor, requestId, 'FORM'),
        ),
      );
      await access.requestAccess(actor, requestId, 'PHOTO');
      const pending = await access.pendingRequests(userId);
      expect(pending.map((row) => row.kind).sort()).toEqual(['FORM', 'PHOTO']);
      expect(pending[0]).toMatchObject({
        requestId,
        providerId,
        providerName: 'Grant QA',
      });
      expect(pending[0]).not.toHaveProperty('series');
      expect(await access.pendingRequests(actor)).toEqual([]);
      expect(
        (
          await access.requestedForProvider(actor, requestId)
        ).pendingKinds.sort(),
      ).toEqual(['FORM', 'PHOTO']);
      expect(
        (await access.mine(userId)).audit.filter(
          (row) => row.action === 'REQUEST_FORM',
        ),
      ).toHaveLength(1);
      await expect(readForm()).rejects.toMatchObject({ status: 403 });
      await expect(readPhoto()).rejects.toMatchObject({ status: 403 });
    });
    it('resolves only the granted kind and rejects unrelated actors', async () => {
      await expect(
        access.requestAccess('stranger', requestId, 'FORM'),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        access.requestAccess('admin', requestId, 'FORM'),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        access.requestedForProvider('stranger', requestId),
      ).rejects.toMatchObject({ status: 404 });
      await access.requestAccess(actor, requestId, 'FORM');
      await access.requestAccess(actor, requestId, 'PHOTO');
      await access.declineRequest(actor, requestId, 'FORM');
      expect(await access.pendingRequests(userId)).toHaveLength(2);
      await grant(true, false);
      expect(
        (await access.pendingRequests(userId)).map((row) => row.kind),
      ).toEqual(['PHOTO']);
      expect(await access.requestAccess(actor, requestId, 'FORM')).toEqual({
        requested: false,
        hasAccess: true,
      });
      await access.declineRequest(userId, requestId, 'PHOTO');
      expect(await access.pendingRequests(userId)).toEqual([]);
      await expect(readPhoto()).rejects.toMatchObject({ status: 403 });
      expect(
        (await access.mine(userId)).audit.some(
          (row) => row.action === 'DECLINE_PHOTO',
        ),
      ).toBe(true);
      await access.requestAccess(actor, requestId, 'PHOTO');
      expect(await access.pendingRequests(userId)).toHaveLength(1);
    });
    it('permits requests before documents exist and removes them on reassignment or closing', async () => {
      await db.passportDocument.deleteMany({ where: { userId } });
      await access.requestAccess(actor, requestId, 'FORM');
      expect(await access.pendingRequests(userId)).toHaveLength(1);
      await db.request.update({
        where: { id: requestId },
        data: { providerId: otherProvider },
      });
      await db.request.update({
        where: { id: requestId },
        data: { providerId },
      });
      expect(await access.pendingRequests(userId)).toEqual([]);
      await access.requestAccess(actor, requestId, 'PHOTO');
      await db.request.update({
        where: { id: requestId },
        data: { status: 'COMPLETED' },
      });
      await expect(
        access.requestAccess(actor, requestId, 'PHOTO'),
      ).rejects.toMatchObject({ status: 400 });
      await db.request.update({
        where: { id: requestId },
        data: { status: 'ACTIVE' },
      });
      expect(await access.pendingRequests(userId)).toEqual([]);
      await access.requestAccess(actor, requestId, 'PHOTO');
      await db.request.update({
        where: { id: requestId },
        data: { customerUserId: actor },
      });
      expect(await access.pendingRequests(userId)).toEqual([]);
      expect(await access.pendingRequests(actor)).toEqual([]);
      await db.request.update({
        where: { id: requestId },
        data: { customerUserId: userId },
      });
    });
    it('does not grant a new provider access from a stale request response', async () => {
      await access.requestAccess(actor, requestId, 'FORM');
      await db.request.update({
        where: { id: requestId },
        data: { providerId: otherProvider },
      });
      await expect(
        access.save(userId, requestId, {
          form: true,
          photo: false,
          durationDays: 7,
          providerId,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await db.passportAccessGrant.count({ where: { requestId } })).toBe(
        0,
      );
    });
    it('rejects other customers, providers, admins, requests and photo IDs', async () => {
      await grant(true, true);
      await expect(
        access.save(actor, requestId, {
          form: true,
          photo: false,
          durationDays: 7,
        }),
      ).rejects.toMatchObject({ status: 404 });
      await access.revoke(actor, requestId, 'FORM');
      expect(await readForm()).toEqual(form);
      await expect(
        documents.getPassportForProviderByOrder({
          actorUserId: 'stranger',
          requestId,
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        documents.getPassportForProviderByOrder({
          actorUserId: 'admin',
          requestId,
        }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        photos.readForProvider(actor, requestId, randomUUID()),
      ).rejects.toMatchObject({ status: 404 });
      const other = await db.request.create({
        data: { customerUserId: userId, providerId, status: 'ACTIVE' },
      });
      await expect(
        documents.getPassportForProviderByOrder({
          actorUserId: actor,
          requestId: other.id,
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
    it('revokes just one kind and blocks expiry before reading storage', async () => {
      await grant(true, true);
      await access.revoke(userId, requestId, 'FORM');
      await access.revoke(userId, requestId, 'FORM');
      await expect(readForm()).rejects.toMatchObject({ status: 403 });
      await readPhoto();
      await db.passportAccessGrant.updateMany({
        where: { requestId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      photoRead.mockClear();
      await expect(readPhoto()).rejects.toMatchObject({ status: 403 });
      expect(photoRead).not.toHaveBeenCalled();
    });
    it('invalidates grants after reassignment and completion, even when reopened', async () => {
      await grant(true, true);
      await db.request.update({
        where: { id: requestId },
        data: { providerId: otherProvider },
      });
      await db.request.update({
        where: { id: requestId },
        data: { providerId },
      });
      await expect(readForm()).rejects.toMatchObject({ status: 403 });
      await grant(true, true);
      await db.request.update({
        where: { id: requestId },
        data: { status: 'COMPLETED' },
      });
      await expect(grant(true, false)).rejects.toMatchObject({ status: 400 });
      await db.request.update({
        where: { id: requestId },
        data: { status: 'ACTIVE' },
      });
      await expect(readPhoto()).rejects.toMatchObject({ status: 403 });
      expect(
        (await access.mine(userId)).audit.some(
          (e) => e.action === 'REQUEST_REVOKE_PHOTO',
        ),
      ).toBe(true);
    });
    it('revokes on source deletion and cannot grant missing data', async () => {
      await grant(true, true);
      await documents.deleteMyPassport({ actorUserId: userId });
      expect((await access.mine(userId)).grants.map((g) => g.kind)).toEqual([
        'PHOTO',
      ]);
      await photos.delete(userId, photoId);
      expect((await access.mine(userId)).grants).toEqual([]);
      await expect(grant(true, false)).rejects.toMatchObject({ status: 400 });
      await expect(grant(false, true)).rejects.toMatchObject({ status: 400 });
    });
  },
);

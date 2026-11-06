import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PassportPhoto, Prisma } from '@prisma/client';
import {
  PassportAccessService,
  revokePassportGrants,
} from './passport-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { PassportPhotoStorageService } from './passport-photo-storage.service';
import {
  lockPassport,
  PassportStorageCleanupService,
} from './passport-storage-cleanup.service';

const publicPhoto = (photo: PassportPhoto) => ({
  id: photo.id,
  mimeType: photo.mimeType,
  sizeBytes: photo.sizeBytes,
  createdAt: photo.createdAt,
});

@Injectable()
export class PassportPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PassportPhotoStorageService,
    private readonly cleanup: PassportStorageCleanupService,
    private readonly access: PassportAccessService,
  ) {}

  async list(userId: string) {
    return (
      await this.prisma.passportPhoto.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    ).map(publicPhoto);
  }

  async upload(userId: string, id: string, file: Express.Multer.File) {
    const photo = await this.storage.prepare(file);
    const existing = await this.prisma.passportPhoto.findFirst({
      where: { id, userId },
    });
    if (existing) {
      if (existing.sha256 !== photo.sha256)
        throw new ConflictException('Повторная загрузка содержит другое фото');
      return publicPhoto(existing);
    }
    if ((await this.prisma.passportPhoto.count({ where: { userId } })) >= 4)
      throw new ConflictException(
        'Можно сохранить не более четырёх фотографий',
      );
    const key = this.storage.createKey(userId, photo.ext);
    await this.prisma.passportObjectCleanup.create({
      data: {
        userId,
        objectKey: key,
        reason: 'UNCOMMITTED_UPLOAD',
        notBefore: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await this.storage.put(key, photo);
    return this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, userId);
        const duplicate = await tx.passportPhoto.findFirst({
          where: { id, userId },
        });
        if (duplicate) {
          if (duplicate.sha256 !== photo.sha256)
            throw new ConflictException(
              'Повторная загрузка содержит другое фото',
            );
          return publicPhoto(duplicate);
        }
        if ((await tx.passportPhoto.count({ where: { userId } })) >= 4)
          throw new ConflictException(
            'Можно сохранить не более четырёх фотографий',
          );
        const pending = await tx.passportObjectCleanup.findUnique({
          where: { objectKey: key },
        });
        if (!pending || pending.reason !== 'UNCOMMITTED_UPLOAD')
          throw new ConflictException('Повторите загрузку фото');
        const saved = await tx.passportPhoto.create({
          data: {
            id,
            userId,
            storageKey: key,
            sha256: photo.sha256,
            mimeType: photo.mimeType,
            sizeBytes: photo.body.length,
          },
        });
        await tx.passportObjectCleanup.delete({ where: { objectKey: key } });
        await this.audit(tx, userId, 'CUSTOMER_PHOTO_WRITE');
        return publicPhoto(saved);
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  }

  async read(userId: string, id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, userId);
        const photo = await tx.passportPhoto.findFirst({
          where: { id, userId },
        });
        if (!photo) throw new NotFoundException('Фотография не найдена');
        const body = await this.storage.read(
          photo.storageKey,
          photo.sha256,
          photo.sizeBytes,
        );
        await this.audit(tx, userId, 'CUSTOMER_PHOTO_READ');
        return { body, mimeType: photo.mimeType };
      },
      { timeout: 90_000, maxWait: 10_000 },
    );
  }

  async delete(userId: string, id: string) {
    await this.prisma.$transaction(
      async (tx) => {
        await lockPassport(tx, userId);
        const removed = await tx.passportPhoto.deleteMany({
          where: { id, userId },
        });
        if (!(await tx.passportPhoto.count({ where: { userId } })))
          await revokePassportGrants(tx, userId, 'PHOTO');
        if (removed.count)
          await this.audit(tx, userId, 'CUSTOMER_PHOTO_DELETE');
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
    // Idempotent retry also completes any queued erasure for this owner.
    await this.cleanup.flushUser(userId);
    return { ok: true };
  }

  async listForProvider(actorUserId: string, requestId: string) {
    return this.access.withProviderAccess(
      actorUserId,
      requestId,
      'PHOTO',
      async (tx, userId) => {
        const photos = await tx.passportPhoto.findMany({
          where: { userId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        return photos.map(publicPhoto);
      },
    );
  }

  async readForProvider(actorUserId: string, requestId: string, id: string) {
    return this.access.withProviderAccess(
      actorUserId,
      requestId,
      'PHOTO',
      async (tx, userId, providerId) => {
        const photo = await tx.passportPhoto.findFirst({
          where: { id, userId },
        });
        if (!photo) throw new NotFoundException('Фотография не найдена');
        const body = await this.storage.read(
          photo.storageKey,
          photo.sha256,
          photo.sizeBytes,
        );
        await tx.passportAccessAudit.create({
          data: {
            passportUserId: userId,
            actorUserId,
            actorProviderId: providerId,
            requestId,
            action: 'PROVIDER_PHOTO_READ',
          },
        });
        return { body, mimeType: photo.mimeType };
      },
    );
  }

  private audit(tx: Prisma.TransactionClient, userId: string, action: string) {
    return tx.passportAccessAudit.create({
      data: { passportUserId: userId, actorUserId: userId, action },
      select: { id: true },
    });
  }
}

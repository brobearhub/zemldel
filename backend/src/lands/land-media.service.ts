import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { DocumentStorageService } from '../storage/document-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { LandsService, type LandActor } from './lands.service';

type LockedListing = Awaited<ReturnType<LandsService['locked']>>;

@Injectable()
export class LandMediaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LandMediaService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly lands: LandsService,
    private readonly storage: DocumentStorageService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.running)
        this.running = this.cleanup()
          .catch(() => this.logger.warn('Land media cleanup postponed'))
          .finally(() => {
            this.running = undefined;
          });
    }, 60000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running;
  }
  async cleanup() {
    const jobs = await this.prisma.landObjectCleanup.findMany({
      where: { notBefore: { lte: new Date() } },
      take: 20,
    });
    for (const job of jobs) {
      try {
        if (
          !(await this.prisma.landMedia.findUnique({
            where: { storageKey: job.objectKey },
          }))
        )
          await this.storage.deleteObject(job.objectKey);
        await this.prisma.landObjectCleanup.deleteMany({
          where: { objectKey: job.objectKey },
        });
      } catch {
        await this.prisma.landObjectCleanup.updateMany({
          where: { objectKey: job.objectKey },
          data: { notBefore: new Date(Date.now() + 60000) },
        });
      }
    }
  }
  private editableRevision(tx: Prisma.TransactionClient, row: LockedListing) {
    if ((row.revision?.status ?? row.status) === 'PENDING')
      throw new ConflictException('Сначала отзовите объявление с модерации');
    return (
      row.revision ??
      (row.status === 'PUBLISHED' ? this.lands.ensureRevision(tx, row) : null)
    );
  }

  private async saveMediaChange(
    tx: Prisma.TransactionClient,
    row: LockedListing,
    revisionMediaIds?: string[],
  ) {
    const review = {
      status: 'DRAFT',
      documentStatus: 'NOT_REQUESTED',
      documentReviewScope: null,
      documentReviewedAt: null,
    } as const;
    if (revisionMediaIds) {
      await tx.landListingRevision.update({
        where: { listingId: row.id },
        data: { ...review, mediaIds: revisionMediaIds, moderationReason: null },
      });
    } else if (row.serviceId) {
      await tx.service.update({
        where: { id: row.serviceId },
        data: { status: 'DRAFT' },
      });
    }
    const updated = await tx.landListing.update({
      where: { id: row.id },
      data: {
        ...(!revisionMediaIds && review),
        ...(row.status === 'WITHDRAWN' && { status: 'DRAFT' }),
        version: { increment: 1 },
      },
      select: { version: true },
    });
    return { ok: true, version: updated.version };
  }

  async upload(
    actor: LandActor,
    listingId: string,
    kind: string,
    version: number,
    file?: Express.Multer.File,
  ) {
    if (!file || !['PHOTO', 'DOCUMENT'].includes(kind))
      throw new BadRequestException('Выберите фотографию или документ');
    const maxSizeMb = kind === 'PHOTO' ? 10 : 15;
    if (file.size > maxSizeMb * 1024 * 1024)
      throw new BadRequestException(`Размер файла — до ${maxSizeMb} МБ`);
    const listing = await this.prisma.landListing.findUnique({
      where: { id: listingId },
      include: { revision: { select: { status: true } } },
    });
    if (!listing) throw new NotFoundException('Объявление не найдено');
    this.lands.assertManage(actor, listing);
    if ((listing.revision?.status ?? listing.status) === 'PENDING')
      throw new ConflictException('Сначала отзовите объявление с модерации');
    let buffer = file.buffer,
      mimeType = file.mimetype,
      filename = file.originalname
        .split('')
        .map((char) =>
          char.charCodeAt(0) < 32 || '/\\'.includes(char) ? '_' : char,
        )
        .join('')
        .slice(0, 200);
    if (kind === 'PHOTO' || mimeType.startsWith('image/')) {
      try {
        const image = sharp(buffer, {
          limitInputPixels: 40000000,
          animated: false,
        });
        const metadata = await image.metadata();
        if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
          throw new Error('format');
        buffer = await image
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();
        mimeType = 'image/webp';
        filename = `${filename.replace(/\.[^.]+$/, '')}.webp`;
      } catch {
        throw new BadRequestException(
          'Не удалось прочитать изображение. Используйте JPEG, PNG или WebP.',
        );
      }
    } else if (
      mimeType !== 'application/pdf' ||
      buffer.subarray(0, 5).toString() !== '%PDF-'
    )
      throw new BadRequestException('Документы: PDF, JPEG, PNG или WebP');
    const id = randomUUID(),
      key = `documents/lands/${listingId}/${id}`;
    await this.prisma.landObjectCleanup.create({
      data: { objectKey: key, notBefore: new Date(Date.now() + 3600000) },
    });
    await this.storage.putObject({
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    return this.prisma.$transaction(async (tx) => {
      const row = await this.lands.locked(tx, listingId, version);
      this.lands.assertManage(actor, row);
      const revision = await this.editableRevision(tx, row);
      const maxCount = kind === 'PHOTO' ? 6 : 10;
      const files = row.media.filter(
        (m) =>
          m.kind === kind && (!revision || revision.mediaIds.includes(m.id)),
      );
      if (files.length >= maxCount)
        throw new BadRequestException(
          `Не более ${maxCount} ${kind === 'PHOTO' ? 'фото' : 'документов'}`,
        );
      await tx.landMedia.create({
        data: {
          id,
          listingId,
          kind,
          storageKey: key,
          filename,
          mimeType,
          size: buffer.length,
          position: (row.media.at(-1)?.position ?? -1) + 1,
          revisionOnly: Boolean(revision),
        },
      });
      await tx.landObjectCleanup.delete({ where: { objectKey: key } });
      return this.saveMediaChange(
        tx,
        row,
        revision ? [...revision.mediaIds, id] : undefined,
      );
    });
  }
  async get(id: string, actor?: LandActor) {
    const media = await this.prisma.landMedia.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!media) throw new NotFoundException('Файл не найден');
    const managed =
      actor && (actor.admin || this.lands.canManage(actor, media.listing));
    if (
      !managed &&
      (media.kind !== 'PHOTO' ||
        media.revisionOnly ||
        media.listing.status !== 'PUBLISHED')
    )
      throw new NotFoundException('Файл недоступен');
    const stored = await this.storage.getObject(media.storageKey);
    if (!stored.Body) throw new NotFoundException('Файл не найден');
    return { media, body: await stored.Body.transformToByteArray() };
  }
  async change(actor: LandActor, id: string, version: number, cover: boolean) {
    const target = await this.prisma.landMedia.findUnique({
      where: { id },
      select: { listingId: true },
    });
    if (!target) throw new NotFoundException('Файл не найден');
    return this.prisma.$transaction(async (tx) => {
      const row = await this.lands.locked(tx, target.listingId, version);
      this.lands.assertManage(actor, row);
      const revision = await this.editableRevision(tx, row);
      const media = row.media.find((m) => m.id === id);
      if (!media || (revision && !revision.mediaIds.includes(id)))
        throw new NotFoundException('Файла нет в редактируемой версии');
      if (cover && media.kind !== 'PHOTO')
        throw new BadRequestException('Обложкой может быть только фотография');
      if (cover && !revision) {
        await tx.landMedia.updateMany({
          where: { listingId: row.id, kind: 'PHOTO' },
          data: { position: { increment: 1 } },
        });
        await tx.landMedia.update({ where: { id }, data: { position: 0 } });
      } else if (!cover && (!revision || media.revisionOnly)) {
        await tx.landObjectCleanup.create({
          data: { objectKey: media.storageKey, notBefore: new Date() },
        });
        await tx.landMedia.delete({ where: { id } });
      }
      const ordered = revision?.mediaIds.filter((mediaId) => mediaId !== id);
      if (cover) ordered?.unshift(id);
      return this.saveMediaChange(tx, row, ordered);
    });
  }
}

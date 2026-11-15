import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { DocumentStorageService } from '../storage/document-storage.service';
import { validateRequestAttachment } from '../common/request-attachment-file';

const fileSelect = {
  id: true,
  folderId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

@Injectable()
export class ProviderDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly storage: DocumentStorageService,
  ) {}

  private async providerId(actorUserId: string) {
    const ctx = await this.auth.getServiceManagementContext(
      actorUserId,
      'read',
    );
    if (ctx.isPlatformAdmin || !ctx.providerId)
      throw new ForbiddenException('Документы исполнителя недоступны.');
    return ctx.providerId;
  }

  private id(value: unknown): string {
    if (typeof value !== 'string' || !isUUID(value))
      throw new BadRequestException(
        'Некорректный идентификатор документа или папки.',
      );
    return value;
  }

  private async folder(providerId: string, value: unknown) {
    if (value === null || value === undefined || value === '') return null;
    const id = this.id(value);
    if (
      !(await this.prisma.providerDocumentFolder.findFirst({
        where: { id, providerId },
      }))
    )
      throw new NotFoundException('Папка не найдена.');
    return id;
  }

  async list(actorUserId: string) {
    const providerId = await this.providerId(actorUserId);
    const [folders, files] = await Promise.all([
      this.prisma.providerDocumentFolder.findMany({
        where: { providerId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.providerDocument.findMany({
        where: { providerId },
        select: fileSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { folders, files };
  }

  async saveFolder(actorUserId: string, name: unknown, folderId?: string) {
    const providerId = await this.providerId(actorUserId);
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 100 ||
      name.includes('/') ||
      name.includes('\\') ||
      [...name].some((character) => character.charCodeAt(0) < 32)
    )
      throw new BadRequestException(
        'Название папки должно содержать от 1 до 100 символов без слешей.',
      );
    if (folderId) await this.folder(providerId, folderId);
    try {
      return folderId
        ? await this.prisma.providerDocumentFolder.update({
            where: { id: folderId, providerId },
            data: { name: name.trim() },
            select: { id: true, name: true },
          })
        : await this.prisma.providerDocumentFolder.create({
            data: { providerId, name: name.trim() },
            select: { id: true, name: true },
          });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException('Папка с таким названием уже существует.');
      throw error;
    }
  }

  async deleteFolder(actorUserId: string, folderId: string) {
    const providerId = await this.providerId(actorUserId);
    await this.folder(providerId, folderId);
    // The FK moves documents to the root; deleting a folder never erases files.
    await this.prisma.providerDocumentFolder.delete({
      where: { id: folderId, providerId },
    });
    return { ok: true };
  }

  async upload(
    actorUserId: string,
    files: Express.Multer.File[],
    folder: unknown,
  ) {
    const providerId = await this.providerId(actorUserId);
    const folderId = await this.folder(providerId, folder);
    if (!files.length || files.length > 10)
      throw new BadRequestException('Выберите от 1 до 10 файлов.');
    const extensions = files.map(validateRequestAttachment);
    const rows = files.map((file, index) => {
      const id = randomUUID();
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const originalName =
        /[ÐÑÃ]/.test(file.originalname) && !decoded.includes('\uFFFD')
          ? decoded
          : file.originalname;
      return {
        id,
        providerId,
        folderId,
        originalName: originalName.normalize('NFC'),
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
        sha256: createHash('sha256').update(file.buffer).digest('hex'),
        storageRelPath: `documents/providers/${providerId}/library/${id}${extensions[index]}`,
      };
    });
    const uploaded: string[] = [];
    try {
      for (const [index, row] of rows.entries()) {
        await this.storage.putObject({
          Key: row.storageRelPath,
          Body: files[index].buffer,
          ContentType: row.mimeType,
        });
        uploaded.push(row.storageRelPath);
      }
      await this.prisma.providerDocument.createMany({ data: rows });
    } catch (error) {
      // Keep objects if commit outcome cannot be established.
      const committed = await this.prisma.providerDocument
        .findMany({
          where: { storageRelPath: { in: uploaded } },
          select: { storageRelPath: true },
        })
        .catch(() => null);
      if (committed)
        await Promise.allSettled(
          uploaded
            .filter(
              (key) => !committed.some((row) => row.storageRelPath === key),
            )
            .map((key) => this.storage.deleteObject(key)),
        );
      throw error;
    }
    return { created: rows.map(({ id }) => ({ id })) };
  }

  private async file(actorUserId: string, fileId: string) {
    const providerId = await this.providerId(actorUserId);
    const file = await this.prisma.providerDocument.findFirst({
      where: { id: this.id(fileId), providerId },
    });
    if (!file) throw new NotFoundException('Документ не найден.');
    return file;
  }

  async move(actorUserId: string, fileId: string, folder: unknown) {
    const file = await this.file(actorUserId, fileId);
    const folderId = await this.folder(file.providerId, folder);
    return this.prisma.providerDocument.update({
      where: { id: file.id, providerId: file.providerId },
      data: { folderId },
      select: fileSelect,
    });
  }

  async deleteFile(actorUserId: string, fileId: string) {
    const file = await this.file(actorUserId, fileId);
    await this.storage.deleteObject(file.storageRelPath);
    await this.prisma.providerDocument.delete({
      where: { id: file.id, providerId: file.providerId },
    });
    return { ok: true };
  }

  async download(actorUserId: string, fileId: string) {
    const file = await this.file(actorUserId, fileId);
    try {
      const object = await this.storage.getObject(file.storageRelPath);
      if (!object.Body) throw new Error('Missing document body');
      return { file, body: object.Body };
    } catch {
      throw new BadGatewayException(
        'Не удалось получить документ из хранилища. Попробуйте ещё раз.',
      );
    }
  }

  async uploadSource(
    actorUserId: string,
    fileId: string,
  ): Promise<Express.Multer.File> {
    const { file, body } = await this.download(actorUserId, fileId);
    const buffer = Buffer.from(await body.transformToByteArray());
    return {
      fieldname: 'document',
      originalname: file.originalName,
      mimetype: file.mimeType,
      size: buffer.length,
      buffer,
      encoding: '7bit',
      stream: Readable.from(buffer),
      destination: '',
      filename: '',
      path: '',
    };
  }

  async listRequests(actorUserId: string) {
    const providerId = await this.providerId(actorUserId);
    const rows = await this.prisma.request.findMany({
      where: {
        customerUserId: { not: null },
        AND: [
          {
            OR: [
              { providerId, lockedAt: { not: null } },
              {
                providerId: null,
                lockedAt: null,
                status: { in: ['NEW', 'DISCUSSING', 'TERMS_AGREED'] },
                providerOffers: { some: { providerId, status: 'SELECTED' } },
              },
            ],
          },
          {
            OR: [
              { contractFiles: { some: { providerId } } },
              { documentRequests: { some: { providerId } } },
              {
                workStages: {
                  some: {
                    providerId,
                    OR: [{ files: { some: {} } }, { docSlots: { some: {} } }],
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        number: true,
        status: true,
        message: true,
        customerName: true,
        createdAt: true,
        service: { select: { title: true } },
        category: { select: { name: true } },
        customerUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(({ service, category, customerUser, ...row }) => ({
      ...row,
      serviceTitle: service?.title ?? null,
      categoryName: category?.name ?? null,
      customerName: row.customerName ?? customerUser?.name ?? null,
    }));
  }

  async requestIds(actorUserId: string) {
    return (await this.listRequests(actorUserId)).map((row) => row.id);
  }
}

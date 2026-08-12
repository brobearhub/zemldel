import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import type { RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { S3Service } from '../storage/s3.service';
import { isExclusiveForActorProvider } from '../requests/dto/request.dto';
import {
  SYSTEM_WORK_STAGE_STATUSES,
  isSystemWorkStageStatusKey,
  resolveStatusLabel,
  type WorkStageStatusOption,
} from './work-stage-statuses';
import type {
  WorkStageDocSlotDto,
  WorkStageDto,
  WorkStageFileDto,
} from './dto/work-stages.dto';

const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

function normalizeExt(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'application/msword') return '.doc';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return '.docx';
  }
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '';
}

function sha256Buffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function countCyrillicChars(value: string) {
  const matches = value.match(/[\u0400-\u04FF]/g);
  return matches ? matches.length : 0;
}

function decodePossiblyMisencodedFileName(value: string) {
  const decoded = Buffer.from(value, 'latin1').toString('utf8').normalize('NFC');
  if (decoded.includes('\uFFFD')) return value;
  const originalCyrillic = countCyrillicChars(value);
  const decodedCyrillic = countCyrillicChars(decoded);
  const looksLikeMojibake = /[ÐÑÃ]/.test(value);
  if (looksLikeMojibake && decodedCyrillic > originalCyrillic) return decoded;
  return value;
}

const READABLE_REQUEST_STATUSES = new Set([
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED',
]);

const ACTIVE_STATUS_USAGE: RequestStatus[] = ['ACTIVE', 'ACCEPTANCE_PENDING'];

function parseCustomStatuses(value: unknown): WorkStageStatusOption[] {
  if (!Array.isArray(value)) return [];
  const out: WorkStageStatusOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const key =
      typeof (item as { key?: unknown }).key === 'string'
        ? (item as { key: string }).key.trim()
        : '';
    const label =
      typeof (item as { label?: unknown }).label === 'string'
        ? (item as { label: string }).label.trim()
        : '';
    if (!key || !label) continue;
    if (isSystemWorkStageStatusKey(key)) continue;
    out.push({ key, label });
  }
  return out;
}

function toFileDto(row: {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
}): WorkStageFileDto {
  return {
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDocSlotDto(row: {
  id: string;
  title: string;
  status: 'REQUESTED' | 'UPLOADED';
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WorkStageDocSlotDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    uploadedAt: row.uploadedAt ? row.uploadedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toStageDto(row: {
  id: string;
  requestId: string;
  title: string;
  description: string;
  statusKey: string;
  statusLabel: string;
  lifecycle: 'DRAFT' | 'PUBLISHED';
  publishedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  files?: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    createdAt: Date;
  }>;
  docSlots?: Array<{
    id: string;
    title: string;
    status: 'REQUESTED' | 'UPLOADED';
    originalName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    sha256: string | null;
    uploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): WorkStageDto {
  return {
    id: row.id,
    requestId: row.requestId,
    title: row.title,
    description: row.description,
    statusKey: row.statusKey,
    statusLabel: row.statusLabel,
    lifecycle: row.lifecycle,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    sortOrder: row.sortOrder,
    files: (row.files ?? []).map(toFileDto),
    docSlots: (row.docSlots ?? []).map(toDocSlotDto),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const stageInclude = {
  files: { orderBy: { createdAt: 'asc' as const } },
  docSlots: { orderBy: { createdAt: 'asc' as const } },
} as const;

@Injectable()
export class RequestWorkStagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly s3: S3Service,
  ) {}

  private async requireProviderId(actorUserId: string) {
    const ctx = await this.authService.getServiceManagementContext(
      actorUserId,
      'read',
    );
    if (ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!ctx.providerId) {
      throw new NotFoundException('Active provider is required');
    }
    return ctx.providerId;
  }

  private async assertProviderRequest(input: {
    providerId: string;
    requestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        providerId: true,
        lockedAt: true,
        customerUserId: true,
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.customerUserId) {
      throw new BadRequestException('Customer is required');
    }
    if (!request.providerId) {
      throw new BadRequestException('Provider is required');
    }
    if (!isExclusiveForActorProvider(request, input.providerId)) {
      throw new ForbiddenException('Forbidden');
    }
    if (!READABLE_REQUEST_STATUSES.has(request.status)) {
      throw new BadRequestException('Work stages are not available');
    }
    return request;
  }

  private assertMutable(status: string) {
    if (status !== 'ACTIVE') {
      throw new BadRequestException('Request must be ACTIVE');
    }
  }

  private async loadCustomStatuses(input: {
    userId: string;
    providerId: string;
  }) {
    const row = await this.prisma.providerUserSettings.findUnique({
      where: {
        userId_providerId: {
          userId: input.userId,
          providerId: input.providerId,
        },
      },
      select: { workStageStatuses: true },
    });
    return parseCustomStatuses(row?.workStageStatuses);
  }

  private async resolveLabelForActor(input: {
    actorUserId: string;
    providerId: string;
    statusKey: string;
  }) {
    const key = input.statusKey.trim();
    if (!key) throw new BadRequestException('Invalid statusKey');
    const custom = await this.loadCustomStatuses({
      userId: input.actorUserId,
      providerId: input.providerId,
    });
    const label = resolveStatusLabel(key, custom);
    if (!label) throw new BadRequestException('Invalid statusKey');
    return { statusKey: key, statusLabel: label };
  }

  async listForProvider(input: { actorUserId: string; requestId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });

    const rows = await this.prisma.requestWorkStage.findMany({
      where: { requestId: input.requestId, providerId },
      include: stageInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    return rows.map(toStageDto);
  }

  async listForCustomer(input: { actorUserId: string; requestId: string }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true, lockedAt: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) return [];
    if (!READABLE_REQUEST_STATUSES.has(request.status)) return [];

    const rows = await this.prisma.requestWorkStage.findMany({
      where: {
        requestId: request.id,
        providerId: request.providerId,
        lifecycle: 'PUBLISHED',
      },
      include: stageInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    return rows.map(toStageDto);
  }

  async createDraft(input: {
    actorUserId: string;
    requestId: string;
    title: string;
    description?: string;
    statusKey: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const title = input.title.trim();
    if (!title) throw new BadRequestException('Title is required');
    const description = (input.description ?? '').trim();
    const { statusKey, statusLabel } = await this.resolveLabelForActor({
      actorUserId: input.actorUserId,
      providerId,
      statusKey: input.statusKey,
    });

    const maxSort = await this.prisma.requestWorkStage.aggregate({
      where: { requestId: input.requestId, providerId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const created = await this.prisma.requestWorkStage.create({
      data: {
        requestId: input.requestId,
        providerId,
        title,
        description,
        statusKey,
        statusLabel,
        lifecycle: 'DRAFT',
        sortOrder,
      },
      include: stageInclude,
    });
    return toStageDto(created);
  }

  async updateDraft(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    title?: string;
    description?: string;
    statusKey?: string;
    sortOrder?: number;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const stage = await this.prisma.requestWorkStage.findFirst({
      where: {
        id: input.stageId,
        requestId: input.requestId,
        providerId,
      },
      select: { id: true, lifecycle: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.lifecycle !== 'DRAFT') {
      throw new BadRequestException('Published stage title/description are immutable');
    }

    const data: {
      title?: string;
      description?: string;
      statusKey?: string;
      statusLabel?: string;
      sortOrder?: number;
    } = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new BadRequestException('Title is required');
      data.title = title;
    }
    if (input.description !== undefined) {
      data.description = input.description.trim();
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = input.sortOrder;
    }
    if (input.statusKey !== undefined) {
      const resolved = await this.resolveLabelForActor({
        actorUserId: input.actorUserId,
        providerId,
        statusKey: input.statusKey,
      });
      data.statusKey = resolved.statusKey;
      data.statusLabel = resolved.statusLabel;
    }

    const updated = await this.prisma.requestWorkStage.update({
      where: { id: stage.id },
      data,
      include: stageInclude,
    });
    return toStageDto(updated);
  }

  async publish(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const stage = await this.prisma.requestWorkStage.findFirst({
      where: {
        id: input.stageId,
        requestId: input.requestId,
        providerId,
      },
      select: { id: true, lifecycle: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.lifecycle !== 'DRAFT') {
      throw new BadRequestException('Stage is already published');
    }

    const updated = await this.prisma.requestWorkStage.update({
      where: { id: stage.id },
      data: {
        lifecycle: 'PUBLISHED',
        publishedAt: new Date(),
      },
      include: stageInclude,
    });
    return toStageDto(updated);
  }

  async updateStatus(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    statusKey: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const stage = await this.prisma.requestWorkStage.findFirst({
      where: {
        id: input.stageId,
        requestId: input.requestId,
        providerId,
      },
      select: { id: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const resolved = await this.resolveLabelForActor({
      actorUserId: input.actorUserId,
      providerId,
      statusKey: input.statusKey,
    });

    const updated = await this.prisma.requestWorkStage.update({
      where: { id: stage.id },
      data: {
        statusKey: resolved.statusKey,
        statusLabel: resolved.statusLabel,
      },
      include: stageInclude,
    });
    return toStageDto(updated);
  }

  /**
   * Why: удалять можно только хвост списка — иначе ломается порядок истории этапов.
   * Черновик и опубликованный — оба ок; файлы в S3 чистим до cascade-delete в БД.
   */
  async deleteStage(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const stage = await this.prisma.requestWorkStage.findFirst({
      where: {
        id: input.stageId,
        requestId: input.requestId,
        providerId,
      },
      select: {
        id: true,
        files: { select: { storageRelPath: true } },
        docSlots: { select: { storageRelPath: true } },
      },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const last = await this.prisma.requestWorkStage.findFirst({
      where: { requestId: input.requestId, providerId },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    if (!last || last.id !== stage.id) {
      throw new BadRequestException('Only the last stage can be deleted');
    }

    const storageKeys = [
      ...stage.files.map((file) => file.storageRelPath),
      ...stage.docSlots
        .map((slot) => slot.storageRelPath)
        .filter((key): key is string => Boolean(key)),
    ];

    await this.prisma.requestWorkStage.delete({
      where: { id: stage.id },
      select: { id: true },
    });

    await Promise.all(
      storageKeys.map((key) =>
        this.s3.client
          .send(
            new DeleteObjectCommand({
              Bucket: this.s3.privateBucket,
              Key: key,
            }),
          )
          .catch(() => null),
      ),
    );

    return { ok: true as const };
  }

  async getWorkStageStatuses(input: { actorUserId: string }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const custom = await this.loadCustomStatuses({
      userId: input.actorUserId,
      providerId,
    });
    return {
      system: SYSTEM_WORK_STAGE_STATUSES.map((item) => ({
        key: item.key,
        label: item.label,
      })),
      custom,
    };
  }

  async replaceCustomWorkStageStatuses(input: {
    actorUserId: string;
    custom: WorkStageStatusOption[];
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const next = parseCustomStatuses(input.custom);
    for (const item of next) {
      if (isSystemWorkStageStatusKey(item.key)) {
        throw new BadRequestException('Custom status key conflicts with system');
      }
    }

    const current = await this.loadCustomStatuses({
      userId: input.actorUserId,
      providerId,
    });
    const nextKeys = new Set(next.map((item) => item.key));
    const removed = current.filter((item) => !nextKeys.has(item.key));

    for (const item of removed) {
      const inUse = await this.prisma.requestWorkStage.findFirst({
        where: {
          providerId,
          statusKey: item.key,
          request: { status: { in: ACTIVE_STATUS_USAGE } },
        },
        select: { id: true },
      });
      if (inUse) {
        throw new BadRequestException(
          'Статус используется в активной заявке',
        );
      }
    }

    await this.prisma.providerUserSettings.upsert({
      where: {
        userId_providerId: {
          userId: input.actorUserId,
          providerId,
        },
      },
      create: {
        userId: input.actorUserId,
        providerId,
        workStageStatuses: next,
      },
      update: {
        workStageStatuses: next,
      },
      select: { id: true },
    });

    return this.getWorkStageStatuses({ actorUserId: input.actorUserId });
  }

  async uploadProviderFile(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    file: Express.Multer.File;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const stage = await this.prisma.requestWorkStage.findFirst({
      where: {
        id: input.stageId,
        requestId: input.requestId,
        providerId,
      },
      select: { id: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const ext = normalizeExt(input.file.originalname, input.file.mimetype);
    if (!ext) throw new BadRequestException('Unsupported file type');
    if (!input.file.buffer || input.file.buffer.length === 0) {
      throw new BadRequestException('Empty file');
    }

    const fileId = randomUUID();
    const storageRelPath = `${this.s3.privatePrefix}requests/${input.requestId}/work-stages/${stage.id}/${fileId}${ext}`;
    const originalName = decodePossiblyMisencodedFileName(
      input.file.originalname,
    );
    const hash = sha256Buffer(input.file.buffer);

    await this.s3.client.send(
      new PutObjectCommand({
        Bucket: this.s3.privateBucket,
        Key: storageRelPath,
        Body: input.file.buffer,
        ContentType: input.file.mimetype,
        CacheControl: 'private, no-store',
      }),
    );

    try {
      const created = await this.prisma.requestWorkStageFile.create({
        data: {
          id: fileId,
          stageId: stage.id,
          uploadedByUserId: input.actorUserId,
          originalName,
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          sha256: hash,
          storageRelPath,
        },
      });
      return toFileDto(created);
    } catch (e) {
      await this.s3.client
        .send(
          new DeleteObjectCommand({
            Bucket: this.s3.privateBucket,
            Key: storageRelPath,
          }),
        )
        .catch(() => null);
      throw e;
    }
  }

  async deleteProviderFile(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    fileId: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const file = await this.prisma.requestWorkStageFile.findFirst({
      where: {
        id: input.fileId,
        stageId: input.stageId,
        stage: { requestId: input.requestId, providerId },
      },
      select: { id: true, storageRelPath: true },
    });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.requestWorkStageFile.delete({
      where: { id: file.id },
      select: { id: true },
    });
    await this.s3.client
      .send(
        new DeleteObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: file.storageRelPath,
        }),
      )
      .catch(() => null);
    return { ok: true as const };
  }

  private async streamStoredFile(input: {
    storageRelPath: string;
    originalName: string;
    mimeType: string;
    inline: boolean;
  }) {
    const fileName = decodePossiblyMisencodedFileName(input.originalName);
    const disposition =
      input.inline && input.mimeType === 'application/pdf'
        ? 'inline'
        : 'attachment';
    try {
      const obj = await this.s3.client.send(
        new GetObjectCommand({
          Bucket: this.s3.privateBucket,
          Key: input.storageRelPath,
        }),
      );
      const body = obj.Body as unknown;
      if (!body || typeof (body as { pipe?: unknown }).pipe !== 'function') {
        throw new NotFoundException('File not found');
      }
      return {
        stream: body as NodeJS.ReadableStream,
        fileName,
        mimeType: input.mimeType,
        disposition,
      };
    } catch (_e) {
      const e = _e as { name?: string; $metadata?: { httpStatusCode?: number } };
      const isNotFound =
        e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
      if (isNotFound) throw new NotFoundException('File not found');
      if (_e instanceof NotFoundException) throw _e;
      throw new BadGatewayException('File storage unavailable');
    }
  }

  async downloadProviderFile(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    fileId: string;
    inline: boolean;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    const file = await this.prisma.requestWorkStageFile.findFirst({
      where: {
        id: input.fileId,
        stageId: input.stageId,
        stage: { requestId: input.requestId, providerId },
      },
      select: {
        originalName: true,
        mimeType: true,
        storageRelPath: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');
    return this.streamStoredFile({ ...file, inline: input.inline });
  }

  async downloadCustomerFile(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    fileId: string;
    inline: boolean;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');
    if (!READABLE_REQUEST_STATUSES.has(request.status)) {
      throw new BadRequestException('Work stages are not available');
    }

    const file = await this.prisma.requestWorkStageFile.findFirst({
      where: {
        id: input.fileId,
        stageId: input.stageId,
        stage: {
          requestId: request.id,
          providerId: request.providerId,
          lifecycle: 'PUBLISHED',
        },
      },
      select: {
        originalName: true,
        mimeType: true,
        storageRelPath: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');
    return this.streamStoredFile({ ...file, inline: input.inline });
  }

  async createDocSlot(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    title: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const stage = await this.prisma.requestWorkStage.findFirst({
      where: {
        id: input.stageId,
        requestId: input.requestId,
        providerId,
      },
      select: { id: true },
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const title = input.title.trim();
    if (title.length < 3) throw new BadRequestException('Title is required');

    const created = await this.prisma.requestWorkStageDocSlot.create({
      data: {
        stageId: stage.id,
        title,
        status: 'REQUESTED',
      },
    });
    return toDocSlotDto(created);
  }

  async deleteDocSlot(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    slotId: string;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertMutable(request.status);

    const slot = await this.prisma.requestWorkStageDocSlot.findFirst({
      where: {
        id: input.slotId,
        stageId: input.stageId,
        stage: { requestId: input.requestId, providerId },
      },
      select: { id: true, status: true },
    });
    if (!slot) throw new NotFoundException('Document slot not found');
    if (slot.status !== 'REQUESTED') {
      throw new BadRequestException('Cannot delete uploaded document slot');
    }

    await this.prisma.requestWorkStageDocSlot.delete({
      where: { id: slot.id },
      select: { id: true },
    });
    return { ok: true as const };
  }

  async uploadCustomerDocSlot(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    slotId: string;
    file: Express.Multer.File;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');
    if (request.status !== 'ACTIVE') {
      throw new BadRequestException('Request must be ACTIVE');
    }

    const slot = await this.prisma.requestWorkStageDocSlot.findFirst({
      where: {
        id: input.slotId,
        stageId: input.stageId,
        stage: {
          requestId: request.id,
          providerId: request.providerId,
          lifecycle: 'PUBLISHED',
        },
      },
      select: { id: true, status: true, storageRelPath: true },
    });
    if (!slot) throw new NotFoundException('Document slot not found');
    if (slot.status !== 'REQUESTED') {
      throw new BadRequestException('Document already uploaded');
    }

    const ext = normalizeExt(input.file.originalname, input.file.mimetype);
    if (!ext) throw new BadRequestException('Unsupported file type');
    if (!input.file.buffer || input.file.buffer.length === 0) {
      throw new BadRequestException('Empty file');
    }

    const storageRelPath = `${this.s3.privatePrefix}requests/${request.id}/work-stages/${input.stageId}/slots/${slot.id}${ext}`;
    const originalName = decodePossiblyMisencodedFileName(
      input.file.originalname,
    );
    const hash = sha256Buffer(input.file.buffer);

    await this.s3.client.send(
      new PutObjectCommand({
        Bucket: this.s3.privateBucket,
        Key: storageRelPath,
        Body: input.file.buffer,
        ContentType: input.file.mimetype,
        CacheControl: 'private, no-store',
      }),
    );

    try {
      await this.prisma.requestWorkStageDocSlot.update({
        where: { id: slot.id },
        data: {
          status: 'UPLOADED',
          uploadedByUserId: input.actorUserId,
          uploadedAt: new Date(),
          originalName,
          mimeType: input.file.mimetype,
          sizeBytes: input.file.size,
          sha256: hash,
          storageRelPath,
        },
        select: { id: true },
      });
    } catch (e) {
      await this.s3.client
        .send(
          new DeleteObjectCommand({
            Bucket: this.s3.privateBucket,
            Key: storageRelPath,
          }),
        )
        .catch(() => null);
      throw e;
    }

    return { ok: true as const };
  }

  async downloadDocSlotForProvider(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    slotId: string;
    inline: boolean;
  }) {
    const providerId = await this.requireProviderId(input.actorUserId);
    await this.assertProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    const slot = await this.prisma.requestWorkStageDocSlot.findFirst({
      where: {
        id: input.slotId,
        stageId: input.stageId,
        stage: { requestId: input.requestId, providerId },
      },
      select: {
        status: true,
        originalName: true,
        mimeType: true,
        storageRelPath: true,
      },
    });
    if (
      !slot ||
      slot.status !== 'UPLOADED' ||
      !slot.storageRelPath ||
      !slot.originalName ||
      !slot.mimeType
    ) {
      throw new NotFoundException('File not found');
    }
    return this.streamStoredFile({
      storageRelPath: slot.storageRelPath,
      originalName: slot.originalName,
      mimeType: slot.mimeType,
      inline: input.inline,
    });
  }

  async downloadDocSlotForCustomer(input: {
    actorUserId: string;
    requestId: string;
    stageId: string;
    slotId: string;
    inline: boolean;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { id: true, providerId: true, status: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!request.providerId) throw new BadRequestException('Provider is required');
    if (!READABLE_REQUEST_STATUSES.has(request.status)) {
      throw new BadRequestException('Work stages are not available');
    }

    const slot = await this.prisma.requestWorkStageDocSlot.findFirst({
      where: {
        id: input.slotId,
        stageId: input.stageId,
        stage: {
          requestId: request.id,
          providerId: request.providerId,
          lifecycle: 'PUBLISHED',
        },
      },
      select: {
        status: true,
        originalName: true,
        mimeType: true,
        storageRelPath: true,
      },
    });
    if (
      !slot ||
      slot.status !== 'UPLOADED' ||
      !slot.storageRelPath ||
      !slot.originalName ||
      !slot.mimeType
    ) {
      throw new NotFoundException('File not found');
    }
    return this.streamStoredFile({
      storageRelPath: slot.storageRelPath,
      originalName: slot.originalName,
      mimeType: slot.mimeType,
      inline: input.inline,
    });
  }
}

export { normalizeExt as normalizeWorkStageFileExt };

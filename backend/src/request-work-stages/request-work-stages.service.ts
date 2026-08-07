import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
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

const READABLE_REQUEST_STATUSES = new Set([
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED',
]);

const ACTIVE_STATUS_USAGE = new Set(['ACTIVE', 'ACCEPTANCE_PENDING']);

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

  async deleteDraft(input: {
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
        lifecycle: true,
        _count: {
          select: {
            files: true,
            docSlots: { where: { status: 'UPLOADED' } },
          },
        },
      },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.lifecycle !== 'DRAFT') {
      throw new BadRequestException('Published stage cannot be deleted');
    }
    if (stage._count.files > 0 || stage._count.docSlots > 0) {
      throw new BadRequestException('Stage has files or uploaded documents');
    }

    await this.prisma.requestWorkStage.delete({
      where: { id: stage.id },
      select: { id: true },
    });
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
          request: { status: { in: [...ACTIVE_STATUS_USAGE] } },
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
}

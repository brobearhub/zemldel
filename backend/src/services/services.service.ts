import {
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import { S3Service } from '../storage/s3.service';
import {
  type ServiceStatus,
  type ServiceCreateDto,
  type ServiceDbRow,
  type ServiceDto,
  type ServicePatchDto,
  serviceDbRowToDtoPlain,
} from './dto/service.dto';
import type { ServiceManagementAction } from '../auth/authorization';

const serviceSelect = {
  id: true,
  categoryId: true,
  status: true,
  title: true,
  image: true,
  stockBadge: true,
  price: true,
  rating: true,
  reviewCount: true,
  ctaText: true,
  ctaHref: true,
  description: true,
  highlight: true,
  badge: true,
  paletteColor: true,
  icon: true,
  provider: {
    select: {
      id: true,
      name: true,
      city: {
        select: {
          id: true,
          name: true,
          regionCode: true,
          regionName: true,
        },
      },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.ServiceSelect;

type ServiceScope = {
  providerId?: string | null;
  actorUserId?: string;
  canPublish?: boolean;
  canArchive?: boolean;
};

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sha256Buffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function sniffImageExt(buf: Buffer, mimeType: string) {
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) return null;
  if (mimeType === 'image/png') {
    if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return '.png';
    }
    return null;
  }
  if (mimeType === 'image/jpeg') {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return '.jpg';
    }
    return null;
  }
  if (mimeType === 'image/webp') {
    if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
      return '.webp';
    }
    return null;
  }
  return null;
}

function tryExtractKeyFromPublicUrl(input: { url: string; baseUrl: string }) {
  try {
    const u = new URL(input.url);
    const b = new URL(input.baseUrl);
    if (u.origin !== b.origin) return null;
    const key = u.pathname.replace(/^\//, '');
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
    private readonly s3: S3Service,
  ) {}

  private async resolveScopedServiceId(id: string, providerId?: string | null) {
    if (!providerId) {
      return id;
    }

    const row = await this.prisma.service.findFirst({
      where: {
        id,
        providerId,
      },
      select: { id: true },
    });

    if (!row) {
      throw new NotFoundException('Service not found');
    }

    return row.id;
  }

  async getServices(
    scope?: Pick<ServiceScope, 'providerId'>,
  ): Promise<ServiceDto[]> {
    const rows: ServiceDbRow[] = await this.prisma.service.findMany({
      where: scope?.providerId
        ? { providerId: scope.providerId }
        : { status: 'PUBLISHED' },
      select: serviceSelect,
      orderBy: [{ category: { slug: 'asc' } }, { title: 'asc' }],
    });

    return rows.map((row) => serviceDbRowToDtoPlain(row));
  }

  async getServiceById(
    id: string,
    scope?: Pick<ServiceScope, 'providerId'>,
  ): Promise<ServiceDto | null> {
    const row = scope?.providerId
      ? await this.prisma.service.findFirst({
          where: { id, providerId: scope.providerId },
          select: serviceSelect,
        })
      : await this.prisma.service.findFirst({
          where: { id, status: 'PUBLISHED' },
          select: serviceSelect,
        });

    return row ? serviceDbRowToDtoPlain(row as ServiceDbRow) : null;
  }

  async createService(
    service: ServiceCreateDto,
    scope: { providerId: string; actorUserId?: string },
  ): Promise<ServiceDto> {
    const nextStatus: ServiceStatus = service.status ?? 'DRAFT';
    const resolvedCategoryId = service.categoryId ?? null;
    if (!resolvedCategoryId)
      throw new BadRequestException('categoryId is required');

    const resolvedTitle = service.title ?? null;
    if (!resolvedTitle) throw new BadRequestException('title is required');

    const resolvedPrice = service.price ?? null;
    if (!resolvedPrice) throw new BadRequestException('price is required');

    const resolvedCtaText = service.ctaText ?? null;
    if (!resolvedCtaText) throw new BadRequestException('ctaText is required');

    const row = await this.prisma.service.create({
      data: {
        ...service,
        categoryId: resolvedCategoryId,
        title: resolvedTitle,
        price: resolvedPrice,
        ctaText: resolvedCtaText,
        description: service.description ?? null,
        status: nextStatus,
        publishedAt: nextStatus === 'PUBLISHED' ? new Date() : null,
        providerId: scope.providerId,
        createdByUserId: scope.actorUserId,
        updatedByUserId: scope.actorUserId,
      },
      select: serviceSelect,
    });

    return serviceDbRowToDtoPlain(row as ServiceDbRow);
  }

  async updateService(
    id: string,
    service: ServicePatchDto,
    scope?: ServiceScope,
  ): Promise<ServiceDto> {
    const serviceId = await this.resolveScopedServiceId(id, scope?.providerId);
    const nextStatus = service.status;

    if (
      (nextStatus === 'PUBLISHED' || nextStatus === 'DRAFT') &&
      scope?.canPublish === false
    ) {
      throw new ForbiddenException('Publishing services is not allowed');
    }

    if (nextStatus === 'ARCHIVED' && scope?.canArchive === false) {
      throw new ForbiddenException('Archiving services is not allowed');
    }

    const row = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...service,
        publishedAt:
          nextStatus === 'PUBLISHED'
            ? new Date()
            : nextStatus === 'DRAFT' || nextStatus === 'ARCHIVED'
              ? null
              : undefined,
        updatedByUserId: scope?.actorUserId,
      },
      select: serviceSelect,
    });

    return serviceDbRowToDtoPlain(row as ServiceDbRow);
  }

  async uploadServiceImage(input: {
    actorUserId: string;
    providerId: string;
    serviceId: string;
    file: Express.Multer.File;
  }) {
    const serviceId = await this.resolveScopedServiceId(
      input.serviceId,
      input.providerId,
    );

    const bucket = this.s3.requirePublicBucket();
    const cdnBase = this.s3.requirePublicCdnBaseUrl();
    const buf = input.file.buffer as Buffer | undefined;
    if (!buf || buf.length === 0) {
      throw new BadRequestException('file is required');
    }

    const ext = sniffImageExt(buf, input.file.mimetype);
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    const hash = sha256Buffer(buf);
    const key = `${this.s3.publicPrefix}services/${serviceId}/${hash}${ext}`;
    const url = `${cdnBase.replace(/\/+$/, '')}/${key}`;

    // Read old image for cleanup (best-effort).
    const prev = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { image: true },
    });

    try {
      await this.s3.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ACL: 'public-read',
          ContentType: input.file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch {
      throw new BadGatewayException('File storage unavailable');
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: { image: url, updatedByUserId: input.actorUserId },
      select: serviceSelect,
    });

    const prevKey =
      prev?.image && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({
            url: prev.image,
            baseUrl: this.s3.publicCdnBaseUrl,
          })
        : null;

    // Best-effort cleanup of previous image if it was ours.
    if (prevKey && prevKey.startsWith(`${this.s3.publicPrefix}services/${serviceId}/`)) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: prevKey }))
        .catch(() => null);
    }

    return serviceDbRowToDtoPlain(updated as ServiceDbRow);
  }

  async deleteServiceImage(input: {
    actorUserId: string;
    providerId: string;
    serviceId: string;
  }) {
    const serviceId = await this.resolveScopedServiceId(
      input.serviceId,
      input.providerId,
    );

    const bucket = this.s3.requirePublicBucket();
    const prev = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { image: true },
    });

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: { image: null, updatedByUserId: input.actorUserId },
      select: serviceSelect,
    });

    const prevKey =
      prev?.image && this.s3.publicCdnBaseUrl
        ? tryExtractKeyFromPublicUrl({
            url: prev.image,
            baseUrl: this.s3.publicCdnBaseUrl,
          })
        : null;

    if (prevKey && prevKey.startsWith(`${this.s3.publicPrefix}services/${serviceId}/`)) {
      await this.s3.client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: prevKey }))
        .catch(() => null);
    }

    return serviceDbRowToDtoPlain(updated as ServiceDbRow);
  }

  async deleteService(id: string, scope?: Pick<ServiceScope, 'providerId'>) {
    const serviceId = await this.resolveScopedServiceId(id, scope?.providerId);

    await this.prisma.service.delete({
      where: { id: serviceId },
    });
  }

  async getManagementContext(
    request: Request,
    action: ServiceManagementAction,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    try {
      return await this.authService.getServiceManagementContext(userId, action);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw error;
    }
  }
}

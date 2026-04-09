import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
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
  templateId: true,
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
  template: {
    select: {
      id: true,
      title: true,
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

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
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

  async getServices(scope?: Pick<ServiceScope, 'providerId'>): Promise<ServiceDto[]> {
    const rows: ServiceDbRow[] = await this.prisma.service.findMany({
      where: scope?.providerId
        ? { providerId: scope.providerId }
        : { status: 'PUBLISHED' },
      select: serviceSelect,
      orderBy: [{ category: { slug: 'asc' } }, { title: 'asc' }],
    });

    return rows.map((row) => serviceDbRowToDtoPlain(row));
  }

  async getServiceById(id: string, scope?: Pick<ServiceScope, 'providerId'>): Promise<ServiceDto | null> {
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
    const template = service.templateId
      ? await this.prisma.serviceTemplate.findUnique({
          where: { id: service.templateId },
          select: { categoryId: true, title: true, description: true },
        })
      : null;

    const resolvedCategoryId = service.categoryId ?? template?.categoryId ?? null;

    if (!resolvedCategoryId) {
      throw new BadRequestException('categoryId is required (or provide templateId)');
    }

    const resolvedTitle = service.title ?? template?.title ?? null;
    if (!resolvedTitle) {
      throw new BadRequestException('title is required (or provide templateId)');
    }

    const resolvedPrice = service.price ?? (service.templateId ? 'По договоренности' : null);
    if (!resolvedPrice) {
      throw new BadRequestException('price is required');
    }

    const resolvedCtaText = service.ctaText ?? (service.templateId ? 'Записаться' : null);
    if (!resolvedCtaText) {
      throw new BadRequestException('ctaText is required');
    }

    const row = await this.prisma.service.create({
      data: {
        ...service,
        categoryId: resolvedCategoryId,
        title: resolvedTitle,
        price: resolvedPrice,
        ctaText: resolvedCtaText,
        description: service.description ?? template?.description ?? service.description,
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

  async updateService(id: string, service: ServicePatchDto, scope?: ServiceScope): Promise<ServiceDto> {
    const serviceId = await this.resolveScopedServiceId(id, scope?.providerId);
    const nextStatus = service.status;

    if ((nextStatus === 'PUBLISHED' || nextStatus === 'DRAFT') && scope?.canPublish === false) {
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

  async deleteService(id: string, scope?: Pick<ServiceScope, 'providerId'>) {
    const serviceId = await this.resolveScopedServiceId(id, scope?.providerId);

    await this.prisma.service.delete({
      where: { id: serviceId },
    });
  }

  async getManagementContext(request: Request, action: ServiceManagementAction) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    try {
      return await this.authService.getServiceManagementContext(userId, action);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }
}

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ServiceRequestCustomerDto,
  ServiceRequestProDto,
  ServiceRequestServiceCreateDto,
  ServiceRequestTemplateCreateDto,
  ServiceRequestUnlinkedCreateDto,
} from './dto/service-request.dto';
import {
  serviceRequestRowToCustomerDtoPlain,
  serviceRequestRowToProDtoPlain,
  type ServiceRequestDbRow,
} from './dto/service-request.dto';

const select = {
  id: true,
  kind: true,
  status: true,
  templateId: true,
  serviceId: true,
  providerId: true,
  customerUserId: true,
  message: true,
  location: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
  template: { select: { title: true } },
  service: { select: { title: true } },
} satisfies Prisma.ServiceRequestSelect;

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getConversationCounts(requestIds: string[]) {
    if (requestIds.length === 0) return new Map<string, number>();

    const grouped = await this.prisma.conversation.groupBy({
      by: ['serviceRequestId'],
      where: { serviceRequestId: { in: requestIds } },
      _count: { _all: true },
    });

    const map = new Map<string, number>();
    for (const row of grouped) {
      if (row.serviceRequestId) {
        map.set(row.serviceRequestId, row._count._all);
      }
    }
    return map;
  }

  private async assertProviderEligibleForTemplate(providerId: string, templateId: string) {
    const service = await this.prisma.service.findFirst({
      where: { providerId, status: 'PUBLISHED', templateId },
      select: { id: true },
    });
    if (!service) {
      throw new ForbiddenException('Forbidden');
    }
  }

  async createForTemplate(
    templateId: string,
    actorUserId: string,
    input: ServiceRequestTemplateCreateDto,
  ): Promise<ServiceRequestCustomerDto> {
    const tpl = await this.prisma.serviceTemplate.findUnique({
      where: { id: templateId },
      select: { id: true },
    });
    if (!tpl) {
      throw new NotFoundException('Template not found');
    }

    const created = await this.prisma.serviceRequest.create({
      data: {
        kind: 'TEMPLATE',
        status: 'NEW',
        templateId,
        customerUserId: actorUserId,
        message: input.message ?? null,
      },
      select,
    });

    return serviceRequestRowToCustomerDtoPlain(created as unknown as ServiceRequestDbRow);
  }

  async createForService(
    serviceId: string,
    actorUserId: string | null,
    input: ServiceRequestServiceCreateDto,
  ): Promise<ServiceRequestCustomerDto> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, status: 'PUBLISHED' },
      select: { id: true, providerId: true },
    });
    if (!service) {
      throw new NotFoundException('Published service not found');
    }

    const actor =
      actorUserId
        ? await this.prisma.user.findUnique({
            where: { id: actorUserId },
            select: { id: true, name: true, email: true },
          })
        : null;

    const customerName = input.customerName ?? actor?.name ?? null;
    const customerEmail = input.customerEmail ?? actor?.email ?? null;
    const customerPhone = input.customerPhone ?? null;
    const message = input.message ?? null;

    if (!customerEmail && !customerPhone) {
      throw new BadRequestException('Customer email or phone is required');
    }

    const created = await this.prisma.serviceRequest.create({
      data: {
        kind: 'SERVICE',
        status: 'NEW',
        serviceId: service.id,
        providerId: service.providerId,
        customerUserId: actor?.id ?? null,
        customerName,
        customerEmail,
        customerPhone,
        message,
      },
      select,
    });

    return serviceRequestRowToCustomerDtoPlain(created as unknown as ServiceRequestDbRow);
  }

  async createUnlinked(actorUserId: string, input: ServiceRequestUnlinkedCreateDto): Promise<ServiceRequestCustomerDto> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, name: true, email: true },
    });
    if (!actor) {
      throw new ForbiddenException('Forbidden');
    }

    const message = input.message ?? null;
    const location = input.location ?? null;
    if (!message) {
      throw new BadRequestException('Message is required');
    }
    if (!location) {
      throw new BadRequestException('Location is required');
    }

    const created = await this.prisma.serviceRequest.create({
      data: {
        kind: 'UNLINKED',
        status: 'NEW',
        customerUserId: actor.id,
        customerName: actor.name ?? null,
        customerEmail: actor.email,
        message,
        location,
      },
      select,
    });

    return serviceRequestRowToCustomerDtoPlain(created as unknown as ServiceRequestDbRow);
  }

  async listMine(actorUserId: string): Promise<ServiceRequestCustomerDto[]> {
    const rows = await this.prisma.serviceRequest.findMany({
      where: { customerUserId: actorUserId },
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) => serviceRequestRowToCustomerDtoPlain(r as unknown as ServiceRequestDbRow));
  }

  async listProFeed(actorProviderId: string): Promise<ServiceRequestProDto[]> {
    const providerTemplateIdsRaw = await this.prisma.service.findMany({
      where: {
        providerId: actorProviderId,
        status: 'PUBLISHED',
        templateId: { not: null },
      },
      select: { templateId: true },
    });
    const templateIds = [...new Set(providerTemplateIdsRaw.map((r) => r.templateId).filter(Boolean) as string[])];

    const or: Prisma.ServiceRequestWhereInput[] = [{ kind: 'UNLINKED' }, { kind: 'SERVICE', providerId: actorProviderId }];
    if (templateIds.length > 0) {
      or.push({ kind: 'TEMPLATE', templateId: { in: templateIds } });
    }
    const where: Prisma.ServiceRequestWhereInput = { OR: or };

    const rows = await this.prisma.serviceRequest.findMany({
      where,
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const ids = rows.map((r) => r.id);
    const counts = await this.getConversationCounts(ids);
    return rows.map((r) => serviceRequestRowToProDtoPlain(r as unknown as ServiceRequestDbRow, counts.get(r.id) ?? 0, actorProviderId));
  }

  async take(actorProviderId: string, requestId: string): Promise<ServiceRequestProDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({ where: { id: requestId }, select });
      if (!current) {
        throw new NotFoundException('Request not found');
      }

      if (current.kind === 'TEMPLATE') {
        if (!current.templateId) {
          throw new NotFoundException('Request not found');
        }
        await this.assertProviderEligibleForTemplate(actorProviderId, current.templateId);
      } else if (current.kind === 'SERVICE') {
        if (!current.providerId || current.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
      }

      if (current.status === 'ACTIVE' || current.status === 'COMPLETED' || current.status === 'CANCELLED') {
        throw new ConflictException('Request already converted to order');
      }
      if (current.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      if (current.providerId && current.providerId !== actorProviderId) {
        throw new ConflictException('Request is already taken');
      }

      const now = new Date();
      return tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: 'LOCKED',
          providerId: current.kind === 'SERVICE' ? current.providerId : actorProviderId,
          lockedAt: current.lockedAt ?? now,
        },
        select,
      });
    });

    const counts = await this.getConversationCounts([updated.id]);
    return serviceRequestRowToProDtoPlain(updated as unknown as ServiceRequestDbRow, counts.get(updated.id) ?? 0, actorProviderId);
  }

  async getProById(actorProviderId: string, requestId: string): Promise<ServiceRequestProDto> {
    const row = await this.prisma.serviceRequest.findUnique({ where: { id: requestId }, select });
    if (!row) {
      throw new NotFoundException('Request not found');
    }

    if (row.kind === 'TEMPLATE') {
      if (!row.templateId) {
        throw new NotFoundException('Request not found');
      }
      await this.assertProviderEligibleForTemplate(actorProviderId, row.templateId);
    } else if (row.kind === 'SERVICE') {
      if (!row.providerId || row.providerId !== actorProviderId) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const counts = await this.getConversationCounts([row.id]);
    return serviceRequestRowToProDtoPlain(row as unknown as ServiceRequestDbRow, counts.get(row.id) ?? 0, actorProviderId);
  }

  async convertToOrder(actorProviderId: string, requestId: string): Promise<{ orderId: string; request: ServiceRequestProDto }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({ where: { id: requestId }, select });
      if (!current) {
        throw new NotFoundException('Request not found');
      }

      if (current.kind === 'TEMPLATE') {
        if (!current.templateId) {
          throw new NotFoundException('Request not found');
        }
        await this.assertProviderEligibleForTemplate(actorProviderId, current.templateId);
      }

      if (current.status === 'ACTIVE' || current.status === 'COMPLETED' || current.status === 'CANCELLED') {
        return { request: current, orderId: current.id };
      }

      if (current.kind === 'SERVICE') {
        if (!current.providerId || current.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
        if (!current.customerUserId) {
          throw new ConflictException('Cannot convert request without customer account');
        }
        const updated = await tx.serviceRequest.update({
          where: { id: current.id },
          data: { status: 'ACTIVE' },
          select,
        });
        return { request: updated, orderId: updated.id };
      }

      if (current.status !== 'LOCKED') {
        throw new BadRequestException('Request must be taken before converting to order');
      }

      if (!current.providerId || current.providerId !== actorProviderId) {
        throw new ForbiddenException('Only the provider who took the request can convert it');
      }

      let serviceId: string | null = null;
      if (current.kind === 'TEMPLATE') {
        const service = await tx.service.findFirst({
          where: { providerId: actorProviderId, status: 'PUBLISHED', templateId: current.templateId },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });
        if (!service) {
          throw new ConflictException('No published service found for this template');
        }
        serviceId = service.id;
      } else {
        const service = await tx.service.findFirst({
          where: { providerId: actorProviderId, status: 'PUBLISHED' },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });
        if (!service) {
          throw new ConflictException('No published service found for this provider');
        }
        serviceId = service.id;
      }

      const updated = await tx.serviceRequest.update({
        where: { id: current.id },
        data: { status: 'ACTIVE', serviceId },
        select,
      });

      return { request: updated, orderId: updated.id };
    });

    const counts = await this.getConversationCounts([result.request.id]);
    return {
      orderId: result.orderId,
      request: serviceRequestRowToProDtoPlain(
        result.request as unknown as ServiceRequestDbRow,
        counts.get(result.request.id) ?? 0,
        actorProviderId,
      ),
    };
  }
}


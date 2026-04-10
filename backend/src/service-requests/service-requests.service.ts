import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ServiceRequestCategoryCreateDto,
  ServiceRequestCustomerDto,
  ServiceRequestDbRow,
  ServiceRequestProDto,
  ServiceRequestServiceCreateDto,
  ServiceRequestUnlinkedCreateDto,
} from './dto/service-request.dto';
import {
  serviceRequestRowToCustomerDtoPlain,
  serviceRequestRowToProDtoPlain,
} from './dto/service-request.dto';

const select = {
  id: true,
  status: true,
  serviceId: true,
  categoryId: true,
  providerId: true,
  pendingProviderId: true,
  pendingInitiator: true,
  pendingAt: true,
  customerUserId: true,
  requestCityId: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  message: true,
  location: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
  service: { select: { title: true, providerId: true } },
  category: { select: { name: true } },
  customerUser: { select: { customerCityId: true } },
} satisfies Prisma.ServiceRequestSelect;

type SubjectType = 'SERVICE' | 'CATEGORY' | 'FREEFORM';
type InboxStatus = 'NEW' | 'DISCUSSING';

function subjectTypeOf(
  row: Pick<ServiceRequestDbRow, 'serviceId' | 'categoryId'>,
): SubjectType {
  if (row.serviceId) return 'SERVICE';
  if (row.categoryId) return 'CATEGORY';
  return 'FREEFORM';
}

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private async getConversationCounts(requestIds: string[]) {
    if (requestIds.length === 0) return new Map<string, number>();

    const map = new Map<string, number>();
    const rows = await this.prisma.conversation.findMany({
      where: {
        serviceRequestId: { in: requestIds },
        messages: { some: {} },
      },
      select: { serviceRequestId: true },
      take: 5000,
    });

    for (const row of rows) {
      map.set(row.serviceRequestId, (map.get(row.serviceRequestId) ?? 0) + 1);
    }
    return map;
  }

  private async getProviderRegionCode(
    providerId: string,
  ): Promise<string | null> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { city: { select: { regionCode: true } } },
    });
    return provider?.city?.regionCode ?? null;
  }

  private async getProviderEligibleCategoryIds(
    providerId: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.service.findMany({
      where: { providerId, status: 'PUBLISHED' },
      select: { categoryId: true },
    });
    return new Set(rows.map((r) => r.categoryId));
  }

  private async resolveRequestsRegionCodes(
    rows: Array<
      Pick<ServiceRequestDbRow, 'id' | 'requestCityId' | 'customerUser'>
    >,
  ): Promise<Map<string, string>> {
    const effectiveCityIds = new Map<string, string>();
    for (const r of rows) {
      const cityId = r.requestCityId ?? r.customerUser?.customerCityId ?? null;
      if (cityId) {
        effectiveCityIds.set(r.id, cityId);
      }
    }

    const uniqueCityIds = [...new Set([...effectiveCityIds.values()])];
    if (uniqueCityIds.length === 0) return new Map();

    const cities = await this.prisma.city.findMany({
      where: { id: { in: uniqueCityIds } },
      select: { id: true, regionCode: true },
    });
    const cityRegion = new Map(cities.map((c) => [c.id, c.regionCode]));

    const byRequest = new Map<string, string>();
    for (const [requestId, cityId] of effectiveCityIds.entries()) {
      const rc = cityRegion.get(cityId);
      if (rc) byRequest.set(requestId, rc);
    }
    return byRequest;
  }

  private assertRequestShape(
    row: Pick<ServiceRequestDbRow, 'serviceId' | 'categoryId'>,
  ) {
    if (row.serviceId && row.categoryId) {
      throw new ConflictException('Invalid request shape');
    }
  }

  private assertProviderEligibleForUnassignedRequest(
    actorProviderId: string,
    row: Pick<
      ServiceRequestDbRow,
      'id' | 'serviceId' | 'categoryId' | 'requestCityId' | 'customerUser'
    >,
    providerRegionCode: string | null,
    eligibleCategoryIds: Set<string>,
    regionByRequestId: Map<string, string>,
  ) {
    this.assertRequestShape(row);

    if (!providerRegionCode) {
      throw new ForbiddenException('Provider city is required');
    }

    const requestRegion = regionByRequestId.get(row.id) ?? null;
    if (!requestRegion) {
      throw new ForbiddenException('Request city is required');
    }

    if (requestRegion !== providerRegionCode) {
      throw new ForbiddenException('Forbidden');
    }

    if (row.serviceId) {
      throw new ForbiddenException('Forbidden');
    }

    if (row.categoryId) {
      if (!eligibleCategoryIds.has(row.categoryId)) {
        throw new ForbiddenException('Forbidden');
      }
    }
  }

  async createForCategory(
    categoryId: string,
    actorUserId: string,
    input: ServiceRequestCategoryCreateDto,
  ): Promise<ServiceRequestCustomerDto> {
    const [category, actor] = await Promise.all([
      this.prisma.serviceCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          customerCityId: true,
        },
      }),
    ]);
    if (!category) throw new NotFoundException('Category not found');
    if (!actor) throw new ForbiddenException('Forbidden');

    const created = await this.prisma.serviceRequest.create({
      data: {
        status: 'NEW',
        categoryId: category.id,
        providerId: null,
        serviceId: null,
        customerUserId: actor.id,
        requestCityId: input.requestCityId ?? actor.customerCityId ?? null,
        customerName: actor.name ?? null,
        customerEmail: actor.email,
        customerPhone: input.customerPhone ?? actor.phone ?? null,
        message: input.message ?? null,
        location: null,
      },
      select,
    });

    return serviceRequestRowToCustomerDtoPlain(
      created as unknown as ServiceRequestDbRow,
    );
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

    const actor = actorUserId
      ? await this.prisma.user.findUnique({
          where: { id: actorUserId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            customerCityId: true,
          },
        })
      : null;

    const customerName = input.customerName ?? actor?.name ?? null;
    const customerEmail = input.customerEmail ?? actor?.email ?? null;
    const customerPhone = input.customerPhone ?? actor?.phone ?? null;
    const message = input.message ?? null;

    if (!customerEmail && !customerPhone) {
      throw new BadRequestException('Customer email or phone is required');
    }

    const created = await this.prisma.serviceRequest.create({
      data: {
        status: 'NEW',
        serviceId: service.id,
        providerId: service.providerId,
        categoryId: null,
        customerUserId: actor?.id ?? null,
        requestCityId: input.requestCityId ?? actor?.customerCityId ?? null,
        customerName,
        customerEmail,
        customerPhone,
        message,
        location: null,
      },
      select,
    });

    return serviceRequestRowToCustomerDtoPlain(
      created as unknown as ServiceRequestDbRow,
    );
  }

  async createUnlinked(
    actorUserId: string,
    input: ServiceRequestUnlinkedCreateDto,
  ): Promise<ServiceRequestCustomerDto> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        customerCityId: true,
      },
    });
    if (!actor) {
      throw new ForbiddenException('Forbidden');
    }

    const message = input.message ?? null;
    if (!message) {
      throw new BadRequestException('Message is required');
    }

    const created = await this.prisma.serviceRequest.create({
      data: {
        status: 'NEW',
        serviceId: null,
        categoryId: null,
        providerId: null,
        customerUserId: actor.id,
        requestCityId: input.requestCityId ?? actor.customerCityId ?? null,
        customerName: actor.name ?? null,
        customerEmail: actor.email,
        customerPhone: input.customerPhone ?? actor.phone ?? null,
        message,
        location: null,
      },
      select,
    });

    return serviceRequestRowToCustomerDtoPlain(
      created as unknown as ServiceRequestDbRow,
    );
  }

  async listMine(actorUserId: string): Promise<ServiceRequestCustomerDto[]> {
    const rows = await this.prisma.serviceRequest.findMany({
      where: { customerUserId: actorUserId },
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) =>
      serviceRequestRowToCustomerDtoPlain(r as unknown as ServiceRequestDbRow),
    );
  }

  async getMineById(
    actorUserId: string,
    requestId: string,
  ): Promise<ServiceRequestCustomerDto> {
    const row = await this.prisma.serviceRequest.findFirst({
      where: { id: requestId, customerUserId: actorUserId },
      select,
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }
    return serviceRequestRowToCustomerDtoPlain(
      row as unknown as ServiceRequestDbRow,
    );
  }

  async listProFeed(actorProviderId: string): Promise<ServiceRequestProDto[]> {
    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const [assignedRows, unassignedRows, activeOtherRows] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: { providerId: actorProviderId },
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.serviceRequest.findMany({
        where: {
          providerId: null,
          status: { in: ['NEW', 'DISCUSSING'] },
        },
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.serviceRequest.findMany({
        where: {
          serviceId: null,
          providerId: { not: null },
          status: 'ACTIVE',
        },
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    ]);

    const [unassignedRegionById, activeRegionById] = await Promise.all([
      this.resolveRequestsRegionCodes(unassignedRows as unknown as ServiceRequestDbRow[]),
      this.resolveRequestsRegionCodes(activeOtherRows as unknown as ServiceRequestDbRow[]),
    ]);
    const eligibleUnassigned: ServiceRequestDbRow[] = [];
    for (const row of unassignedRows as unknown as ServiceRequestDbRow[]) {
      try {
        this.assertProviderEligibleForUnassignedRequest(
          actorProviderId,
          row,
          providerRegionCode,
          eligibleCategoryIds,
          unassignedRegionById,
        );
        eligibleUnassigned.push(row);
      } catch {
        // not eligible
      }
    }

    const eligibleActiveOther: ServiceRequestDbRow[] = [];
    for (const row of activeOtherRows as unknown as ServiceRequestDbRow[]) {
      if (!row.providerId || row.providerId === actorProviderId) continue;
      try {
        this.assertProviderEligibleForUnassignedRequest(
          actorProviderId,
          row,
          providerRegionCode,
          eligibleCategoryIds,
          activeRegionById,
        );
        eligibleActiveOther.push(row);
      } catch {
        // not eligible
      }
    }

    const merged = [
      ...(assignedRows as unknown as ServiceRequestDbRow[]),
      ...eligibleUnassigned,
      ...eligibleActiveOther,
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 200);

    const ids = merged.map((r) => r.id);
    const counts = await this.getConversationCounts(ids);
    return merged.map((r) =>
      serviceRequestRowToProDtoPlain(r, counts.get(r.id) ?? 0, actorProviderId),
    );
  }

  async listProInbox(
    actorProviderId: string,
    input: { status?: InboxStatus; categoryId?: string | null },
  ): Promise<ServiceRequestProDto[]> {
    const status: InboxStatus = input.status ?? 'NEW';
    if (status !== 'NEW' && status !== 'DISCUSSING') {
      throw new BadRequestException('Invalid status');
    }

    let categoryId: string | null | undefined = input.categoryId;
    if (typeof categoryId === 'string') {
      const trimmed = categoryId.trim();
      categoryId = trimmed.length === 0 || trimmed.toLowerCase() === 'null' ? null : trimmed;
    }
    if (categoryId !== undefined && categoryId !== null && !this.isUuid(categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }

    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const baseWhere: Prisma.ServiceRequestWhereInput = {
      providerId: null,
      serviceId: null,
      status: { in: ['NEW', 'DISCUSSING'] },
      ...(categoryId === undefined
        ? {}
        : categoryId === null
          ? { categoryId: null }
          : { categoryId }),
    };

    const perProviderConversationHasMessages: Prisma.ServiceRequestWhereInput =
      status === 'DISCUSSING'
        ? {
            conversations: {
              some: { providerId: actorProviderId, messages: { some: {} } },
            },
          }
        : {
            NOT: {
              conversations: {
                some: { providerId: actorProviderId, messages: { some: {} } },
              },
            },
          };

    const rows = await this.prisma.serviceRequest.findMany({
      where: { ...baseWhere, ...perProviderConversationHasMessages },
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const regionById = await this.resolveRequestsRegionCodes(
      rows as unknown as ServiceRequestDbRow[],
    );
    const eligible: ServiceRequestDbRow[] = [];
    for (const row of rows as unknown as ServiceRequestDbRow[]) {
      try {
        this.assertProviderEligibleForUnassignedRequest(
          actorProviderId,
          row,
          providerRegionCode,
          eligibleCategoryIds,
          regionById,
        );
        eligible.push(row);
      } catch {
        // not eligible
      }
    }

    const merged = eligible
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 200);

    const ids = merged.map((r) => r.id);
    const counts = await this.getConversationCounts(ids);
    return merged.map((r) =>
      serviceRequestRowToProDtoPlain(r, counts.get(r.id) ?? 0, actorProviderId),
    );
  }

  async listProEligibleCategories(actorProviderId: string): Promise<
    Array<{ id: string; name: string; slug: string }>
  > {
    const rows = await this.prisma.service.findMany({
      where: { providerId: actorProviderId, status: 'PUBLISHED' },
      select: {
        categoryId: true,
        category: { select: { id: true, name: true, slug: true } },
      },
      distinct: ['categoryId'],
      orderBy: [{ category: { slug: 'asc' } }],
      take: 200,
    });

    return rows
      .map((r) => r.category)
      .filter(Boolean)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  }

  async getProInboxSettings(
    actorUserId: string,
    actorProviderId: string,
  ): Promise<{ status: InboxStatus; categoryId: string | null }> {
    const row = await this.prisma.providerUserSettings.findUnique({
      where: {
        userId_providerId: {
          userId: actorUserId,
          providerId: actorProviderId,
        },
      },
      select: { proInboxFilters: true },
    });

    if (!row?.proInboxFilters) {
      return { status: 'NEW', categoryId: null };
    }

    try {
      const parsed = row.proInboxFilters as Partial<{
        status: unknown;
        categoryId: unknown;
      }>;
      const status =
        parsed.status === 'DISCUSSING'
          ? 'DISCUSSING'
          : parsed.status === 'NEW'
            ? 'NEW'
            : 'NEW';
      const categoryId =
        parsed.categoryId === null
          ? null
          : typeof parsed.categoryId === 'string' &&
              this.isUuid(parsed.categoryId.trim())
            ? parsed.categoryId.trim()
            : null;
      return { status, categoryId };
    } catch {
      return { status: 'NEW', categoryId: null };
    }
  }

  async setProInboxSettings(
    actorUserId: string,
    actorProviderId: string,
    input: { status?: InboxStatus; categoryId?: string | null },
  ): Promise<{ status: InboxStatus; categoryId: string | null }> {
    const status: InboxStatus = input.status ?? 'NEW';
    if (status !== 'NEW' && status !== 'DISCUSSING') {
      throw new BadRequestException('Invalid status');
    }

    let categoryId: string | null | undefined = input.categoryId;
    if (typeof categoryId === 'string') {
      const trimmed = categoryId.trim();
      categoryId = trimmed.length === 0 || trimmed.toLowerCase() === 'null' ? null : trimmed;
    }
    if (categoryId !== undefined && categoryId !== null && !this.isUuid(categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }

    const normalized = { status, categoryId: categoryId ?? null };
    await this.prisma.providerUserSettings.upsert({
      where: {
        userId_providerId: {
          userId: actorUserId,
          providerId: actorProviderId,
        },
      },
      create: {
        userId: actorUserId,
        providerId: actorProviderId,
        proInboxFilters: normalized,
      },
      update: {
        proInboxFilters: normalized,
      },
      select: { id: true },
    });

    return normalized;
  }

  async take(
    actorProviderId: string,
    requestId: string,
  ): Promise<ServiceRequestProDto> {
    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) {
        throw new NotFoundException('Request not found');
      }

      const row = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(row);

      if (
        row.status === 'ACTIVE' ||
        row.status === 'COMPLETED' ||
        row.status === 'CANCELLED'
      ) {
        throw new ConflictException('Request already converted to order');
      }
      if (row.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      const type = subjectTypeOf(row);

      if (type === 'SERVICE') {
        if (!row.providerId || row.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
      } else {
        if (row.providerId && row.providerId !== actorProviderId) {
          throw new ConflictException('Request is already taken');
        }

        const regionById = await this.resolveRequestsRegionCodes([
          {
            id: row.id,
            requestCityId: row.requestCityId,
            customerUser: row.customerUser ?? null,
          },
        ]);
        this.assertProviderEligibleForUnassignedRequest(
          actorProviderId,
          {
            id: row.id,
            serviceId: row.serviceId,
            categoryId: row.categoryId,
            requestCityId: row.requestCityId,
            customerUser: row.customerUser ?? null,
          },
          providerRegionCode,
          eligibleCategoryIds,
          regionById,
        );
      }

      const now = new Date();
      return tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: 'LOCKED',
          providerId: row.providerId ?? actorProviderId,
          lockedAt: row.lockedAt ?? now,
        },
        select,
      });
    });

    const counts = await this.getConversationCounts([updated.id]);
    return serviceRequestRowToProDtoPlain(
      updated as unknown as ServiceRequestDbRow,
      counts.get(updated.id) ?? 0,
      actorProviderId,
    );
  }

  async getProById(
    actorProviderId: string,
    requestId: string,
  ): Promise<ServiceRequestProDto> {
    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const row = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select,
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }

    const req = row as unknown as ServiceRequestDbRow;
    this.assertRequestShape(req);

    const type = subjectTypeOf(req);
    if (type === 'SERVICE') {
      if (!req.providerId || req.providerId !== actorProviderId) {
        throw new ForbiddenException('Forbidden');
      }
    } else {
      const locked =
        (req.status === 'ACTIVE' ||
          req.status === 'COMPLETED' ||
          req.status === 'CANCELLED') &&
        Boolean(req.providerId) &&
        req.providerId !== actorProviderId;
      if (locked) {
        throw new ForbiddenException('Request is locked');
      }

      const regionById = await this.resolveRequestsRegionCodes([
        {
          id: req.id,
          requestCityId: req.requestCityId,
          customerUser: req.customerUser ?? null,
        },
      ]);
      this.assertProviderEligibleForUnassignedRequest(
        actorProviderId,
        {
          id: req.id,
          serviceId: req.serviceId,
          categoryId: req.categoryId,
          requestCityId: req.requestCityId,
          customerUser: req.customerUser ?? null,
        },
        providerRegionCode,
        eligibleCategoryIds,
        regionById,
      );
    }

    const counts = await this.getConversationCounts([req.id]);
    return serviceRequestRowToProDtoPlain(
      req,
      counts.get(req.id) ?? 0,
      actorProviderId,
    );
  }

  async convertToOrder(
    actorProviderId: string,
    requestId: string,
  ): Promise<{ orderId: string; request: ServiceRequestProDto }> {
    const eligibleCategoryIds =
      await this.getProviderEligibleCategoryIds(actorProviderId);

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) {
        throw new NotFoundException('Request not found');
      }

      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      if (
        req.status === 'ACTIVE' ||
        req.status === 'COMPLETED' ||
        req.status === 'CANCELLED'
      ) {
        return { request: req, orderId: req.id };
      }

      const type = subjectTypeOf(req);

      if (type === 'SERVICE') {
        if (!req.providerId || req.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
        if (!req.customerUserId) {
          throw new ConflictException(
            'Cannot convert request without customer account',
          );
        }
        const updated = await tx.serviceRequest.update({
          where: { id: req.id },
          data: { status: 'ACTIVE' },
          select,
        });
        return {
          request: updated as unknown as ServiceRequestDbRow,
          orderId: updated.id,
        };
      }

      if (req.status !== 'LOCKED') {
        throw new BadRequestException(
          'Request must be taken before converting to order',
        );
      }
      if (!req.providerId || req.providerId !== actorProviderId) {
        throw new ForbiddenException(
          'Only the provider who took the request can convert it',
        );
      }

      let serviceId: string;
      if (type === 'CATEGORY') {
        if (!req.categoryId || !eligibleCategoryIds.has(req.categoryId)) {
          throw new ForbiddenException('Forbidden');
        }
        const service = await tx.service.findFirst({
          where: {
            providerId: actorProviderId,
            status: 'PUBLISHED',
            categoryId: req.categoryId,
          },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });
        if (!service) {
          throw new ConflictException(
            'No published service found for this category',
          );
        }
        serviceId = service.id;
      } else {
        const service = await tx.service.findFirst({
          where: { providerId: actorProviderId, status: 'PUBLISHED' },
          orderBy: [{ createdAt: 'asc' }],
          select: { id: true },
        });
        if (!service) {
          throw new ConflictException(
            'No published service found for this provider',
          );
        }
        serviceId = service.id;
      }

      const updated = await tx.serviceRequest.update({
        where: { id: req.id },
        data: { status: 'ACTIVE', serviceId },
        select,
      });

      return {
        request: updated as unknown as ServiceRequestDbRow,
        orderId: updated.id,
      };
    });

    const counts = await this.getConversationCounts([result.request.id]);
    return {
      orderId: result.orderId,
      request: serviceRequestRowToProDtoPlain(
        result.request,
        counts.get(result.request.id) ?? 0,
        actorProviderId,
      ),
    };
  }

  async initiateOrderByProvider(
    actorProviderId: string,
    requestId: string,
  ): Promise<ServiceRequestProDto> {
    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      if (
        req.status === 'ACTIVE' ||
        req.status === 'COMPLETED' ||
        req.status === 'CANCELLED'
      ) {
        throw new ConflictException('Request already converted to order');
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      const type = subjectTypeOf(req);
      if (type === 'SERVICE') {
        if (!req.providerId || req.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
      } else {
        if (req.providerId && req.providerId !== actorProviderId) {
          throw new ConflictException('Request is already in work');
        }

        const regionById = await this.resolveRequestsRegionCodes([
          {
            id: req.id,
            requestCityId: req.requestCityId,
            customerUser: req.customerUser ?? null,
          },
        ]);
        this.assertProviderEligibleForUnassignedRequest(
          actorProviderId,
          {
            id: req.id,
            serviceId: req.serviceId,
            categoryId: req.categoryId,
            requestCityId: req.requestCityId,
            customerUser: req.customerUser ?? null,
          },
          providerRegionCode,
          eligibleCategoryIds,
          regionById,
        );
      }

      const now = new Date();
      const canUpdatePending =
        req.pendingProviderId === null ||
        req.pendingProviderId === actorProviderId;
      if (!canUpdatePending) {
        throw new ConflictException('Another provider is pending for this request');
      }

      return tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          pendingProviderId: actorProviderId,
          pendingInitiator: 'PROVIDER',
          pendingAt: now,
        },
        select,
      });
    });

    const counts = await this.getConversationCounts([updated.id]);
    return serviceRequestRowToProDtoPlain(
      updated as unknown as ServiceRequestDbRow,
      counts.get(updated.id) ?? 0,
      actorProviderId,
    );
  }

  async initiateOrderByCustomer(
    actorUserId: string,
    requestId: string,
    input: { conversationId: string },
  ): Promise<ServiceRequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      if (req.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }

      if (
        req.status === 'ACTIVE' ||
        req.status === 'COMPLETED' ||
        req.status === 'CANCELLED'
      ) {
        throw new ConflictException('Request already converted to order');
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      const conv = await tx.conversation.findFirst({
        where: { id: input.conversationId, serviceRequestId: req.id, customerUserId: actorUserId },
        select: { providerId: true },
      });
      if (!conv) {
        throw new NotFoundException('Conversation not found');
      }

      const providerId = conv.providerId;
      const canUpdatePending =
        req.pendingProviderId === null || req.pendingProviderId === providerId;
      if (!canUpdatePending) {
        throw new ConflictException('Another provider is pending for this request');
      }

      const now = new Date();
      return tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          pendingProviderId: providerId,
          pendingInitiator: 'CUSTOMER',
          pendingAt: now,
        },
        select,
      });
    });

    return serviceRequestRowToCustomerDtoPlain(
      updated as unknown as ServiceRequestDbRow,
    );
  }

  private async resolveServiceIdForOrder(
    tx: Prisma.TransactionClient,
    actorProviderId: string,
    req: ServiceRequestDbRow,
    eligibleCategoryIds: Set<string>,
  ): Promise<string> {
    if (req.serviceId) {
      return req.serviceId;
    }

    if (req.categoryId) {
      if (!eligibleCategoryIds.has(req.categoryId)) {
        throw new ForbiddenException('Forbidden');
      }
      const service = await tx.service.findFirst({
        where: {
          providerId: actorProviderId,
          status: 'PUBLISHED',
          categoryId: req.categoryId,
        },
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true },
      });
      if (!service) {
        throw new ConflictException('No published service found for this category');
      }
      return service.id;
    }

    const service = await tx.service.findFirst({
      where: { providerId: actorProviderId, status: 'PUBLISHED' },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true },
    });
    if (!service) {
      throw new ConflictException('No published service found for this provider');
    }
    return service.id;
  }

  async confirmOrderByProvider(
    actorProviderId: string,
    requestId: string,
  ): Promise<{ orderId: string; request: ServiceRequestProDto }> {
    const eligibleCategoryIds =
      await this.getProviderEligibleCategoryIds(actorProviderId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      if (
        req.status === 'ACTIVE' ||
        req.status === 'COMPLETED' ||
        req.status === 'CANCELLED'
      ) {
        return current;
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      if (req.pendingInitiator !== 'CUSTOMER') {
        throw new BadRequestException('Request is not pending customer confirmation');
      }
      if (!req.pendingProviderId || req.pendingProviderId !== actorProviderId) {
        throw new ForbiddenException('Forbidden');
      }

      const serviceId = await this.resolveServiceIdForOrder(
        tx,
        actorProviderId,
        req,
        eligibleCategoryIds,
      );

      const now = new Date();
      return tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: 'ACTIVE',
          providerId: actorProviderId,
          serviceId,
          lockedAt: req.lockedAt ?? now,
          pendingProviderId: null,
          pendingInitiator: null,
          pendingAt: null,
        },
        select,
      });
    });

    const counts = await this.getConversationCounts([updated.id]);
    return {
      orderId: updated.id,
      request: serviceRequestRowToProDtoPlain(
        updated as unknown as ServiceRequestDbRow,
        counts.get(updated.id) ?? 0,
        actorProviderId,
      ),
    };
  }

  async confirmOrderByCustomer(
    actorUserId: string,
    requestId: string,
  ): Promise<{ orderId: string; request: ServiceRequestCustomerDto }> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      if (req.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }

      if (
        req.status === 'ACTIVE' ||
        req.status === 'COMPLETED' ||
        req.status === 'CANCELLED'
      ) {
        return current;
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      if (req.pendingInitiator !== 'PROVIDER') {
        throw new BadRequestException('Request is not pending provider confirmation');
      }
      if (!req.pendingProviderId) {
        throw new BadRequestException('pendingProviderId missing');
      }

      const providerId = req.pendingProviderId;
      const eligibleCategoryIds =
        await this.getProviderEligibleCategoryIds(providerId);

      const serviceId = await this.resolveServiceIdForOrder(
        tx,
        providerId,
        req,
        eligibleCategoryIds,
      );

      const now = new Date();
      return tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: 'ACTIVE',
          providerId,
          serviceId,
          lockedAt: req.lockedAt ?? now,
          pendingProviderId: null,
          pendingInitiator: null,
          pendingAt: null,
        },
        select,
      });
    });

    return {
      orderId: updated.id,
      request: serviceRequestRowToCustomerDtoPlain(
        updated as unknown as ServiceRequestDbRow,
      ),
    };
  }
}

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
  ORDER_PHASE_STATUSES,
  isOrderPhaseStatus,
  serviceRequestRowToCustomerDtoPlain,
  serviceRequestRowToProDtoPlain,
} from './dto/service-request.dto';

const select = {
  id: true,
  status: true,
  serviceId: true,
  categoryId: true,
  providerId: true,
  customerUserId: true,
  requestCityId: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  message: true,
  location: true,
  lockedAt: true,
  dealTerms: true,
  offerVersion: true,
  contractAcceptedAt: true,
  acceptanceRequestedAt: true,
  autoAcceptAt: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
  service: { select: { title: true, providerId: true } },
  category: { select: { name: true } },
  customerUser: { select: { customerCityId: true } },
  providerOffers: {
    select: {
      providerId: true,
      status: true,
      selectedAt: true,
      declinedAt: true,
    },
  },
} satisfies Prisma.ServiceRequestSelect;

type SubjectType = 'SERVICE' | 'CATEGORY' | 'FREEFORM';
type InboxStatus = 'NEW' | 'DISCUSSING';
type DialogScope = 'ACTIVE' | 'ARCHIVE';

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

  private async addEvent(
    tx: Prisma.TransactionClient,
    input: {
      serviceRequestId: string;
      type: string;
      actorUserId?: string | null;
      actorProviderId?: string | null;
      payload?: Prisma.InputJsonValue | null;
    },
  ) {
    await tx.serviceRequestEvent.create({
      data: {
        serviceRequestId: input.serviceRequestId,
        type: input.type,
        actorUserId: input.actorUserId ?? null,
        actorProviderId: input.actorProviderId ?? null,
        payload: input.payload ?? undefined,
      },
      select: { id: true },
    });
  }

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
        providerOffers: {
          create: {
            providerId: service.providerId,
            status: 'SELECTED',
          },
        },
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
    input: {
      status?: InboxStatus;
      categoryId?: string | null;
      dialogScope?: DialogScope;
    },
  ): Promise<ServiceRequestProDto[]> {
    const status: InboxStatus = input.status ?? 'NEW';
    if (status !== 'NEW' && status !== 'DISCUSSING') {
      throw new BadRequestException('Invalid status');
    }

    const dialogScope: DialogScope =
      input.dialogScope === 'ARCHIVE' ? 'ARCHIVE' : 'ACTIVE';

    let categoryId: string | null | undefined = input.categoryId;
    if (typeof categoryId === 'string') {
      const trimmed = categoryId.trim();
      categoryId = trimmed.length === 0 || trimmed.toLowerCase() === 'null' ? null : trimmed;
    }
    if (categoryId !== undefined && categoryId !== null && !this.isUuid(categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }

    if (status === 'DISCUSSING' && dialogScope === 'ARCHIVE') {
      const archiveWhere: Prisma.ServiceRequestWhereInput = {
        status: { in: [...ORDER_PHASE_STATUSES] },
        AND: [
          { providerId: { not: null } },
          { providerId: { not: actorProviderId } },
        ],
        conversations: {
          some: { providerId: actorProviderId, messages: { some: {} } },
        },
        ...(categoryId === undefined
          ? {}
          : categoryId === null
            ? { categoryId: null }
            : { categoryId }),
      };

      const rows = await this.prisma.serviceRequest.findMany({
        where: archiveWhere,
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      });

      const ids = (rows as unknown as ServiceRequestDbRow[]).map((r) => r.id);
      const counts = await this.getConversationCounts(ids);
      return (rows as unknown as ServiceRequestDbRow[]).map((r) =>
        serviceRequestRowToProDtoPlain(r, counts.get(r.id) ?? 0, actorProviderId),
      );
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
  ): Promise<{ status: InboxStatus; categoryId: string | null; dialogScope: DialogScope }> {
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
      return { status: 'NEW', categoryId: null, dialogScope: 'ACTIVE' };
    }

    try {
      const parsed = row.proInboxFilters as Partial<{
        status: unknown;
        categoryId: unknown;
        dialogScope: unknown;
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
      const dialogScope: DialogScope =
        parsed.dialogScope === 'ARCHIVE' ? 'ARCHIVE' : 'ACTIVE';
      return { status, categoryId, dialogScope };
    } catch {
      return { status: 'NEW', categoryId: null, dialogScope: 'ACTIVE' };
    }
  }

  async setProInboxSettings(
    actorUserId: string,
    actorProviderId: string,
    input: {
      status?: InboxStatus;
      categoryId?: string | null;
      dialogScope?: DialogScope;
    },
  ): Promise<{ status: InboxStatus; categoryId: string | null; dialogScope: DialogScope }> {
    const status: InboxStatus = input.status ?? 'NEW';
    if (status !== 'NEW' && status !== 'DISCUSSING') {
      throw new BadRequestException('Invalid status');
    }

    const dialogScope: DialogScope =
      input.dialogScope === 'ARCHIVE' ? 'ARCHIVE' : 'ACTIVE';

    let categoryId: string | null | undefined = input.categoryId;
    if (typeof categoryId === 'string') {
      const trimmed = categoryId.trim();
      categoryId = trimmed.length === 0 || trimmed.toLowerCase() === 'null' ? null : trimmed;
    }
    if (categoryId !== undefined && categoryId !== null && !this.isUuid(categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }

    const normalized = { status, categoryId: categoryId ?? null, dialogScope };
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

  // Legacy `take` flow removed.

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

    const lockedToOtherProvider =
      isOrderPhaseStatus(req.status) &&
      Boolean(req.providerId) &&
      req.providerId !== actorProviderId;

    if (lockedToOtherProvider) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          serviceRequestId: req.id,
          providerId: actorProviderId,
          messages: { some: {} },
        },
        select: { id: true },
      });
      if (!existing) {
        throw new ForbiddenException('Request is locked');
      }
    } else {
      const type = subjectTypeOf(req);
      if (type === 'SERVICE') {
        if (!req.providerId || req.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
      } else {
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

    }

    const counts = await this.getConversationCounts([req.id]);
    return serviceRequestRowToProDtoPlain(
      req,
      counts.get(req.id) ?? 0,
      actorProviderId,
    );
  }

  // Legacy `convertToOrder` flow removed.

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

      if (isOrderPhaseStatus(req.status)) {
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
      const now = new Date();
      // Selecting a provider for negotiation does not imply payment/advance.

      await tx.serviceRequestProviderOffer.upsert({
        where: {
          serviceRequestId_providerId: { serviceRequestId: req.id, providerId },
        },
        create: {
          serviceRequestId: req.id,
          providerId,
          status: 'SELECTED',
          selectedAt: now,
          declinedAt: null,
        },
        update: {
          status: 'SELECTED',
          selectedAt: now,
          declinedAt: null,
        },
        select: { id: true },
      });

      const refreshed = await tx.serviceRequest.findUnique({
        where: { id: req.id },
        select,
      });
      if (!refreshed) throw new NotFoundException('Request not found');
      return refreshed;
    });

    return serviceRequestRowToCustomerDtoPlain(
      updated as unknown as ServiceRequestDbRow,
    );
  }

  // Advance-payment flow has been removed in favor of escrow + accepted-result payout.

  async declineOfferByProvider(
    actorProviderId: string,
    requestId: string,
  ): Promise<ServiceRequestProDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      if (isOrderPhaseStatus(req.status)) {
        throw new ConflictException('Request already converted to order');
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      const offer = await tx.serviceRequestProviderOffer.findUnique({
        where: {
          serviceRequestId_providerId: {
            serviceRequestId: req.id,
            providerId: actorProviderId,
          },
        },
        select: { id: true, status: true },
      });
      if (!offer || offer.status !== 'SELECTED') {
        throw new BadRequestException('No active offer to decline');
      }

      const now = new Date();
      await tx.serviceRequestProviderOffer.update({
        where: { id: offer.id },
        data: { status: 'DECLINED', declinedAt: now },
        select: { id: true },
      });

      const refreshed = await tx.serviceRequest.findUnique({
        where: { id: req.id },
        select,
      });
      if (!refreshed) throw new NotFoundException('Request not found');
      return refreshed;
    });

    const counts = await this.getConversationCounts([updated.id]);
    return serviceRequestRowToProDtoPlain(
      updated as unknown as ServiceRequestDbRow,
      counts.get(updated.id) ?? 0,
      actorProviderId,
    );
  }

  async setTermsByProvider(
    actorProviderId: string,
    requestId: string,
    input: { dealTerms: Prisma.InputJsonValue },
  ): Promise<ServiceRequestProDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const req = current as unknown as ServiceRequestDbRow;
      this.assertRequestShape(req);

      const type = subjectTypeOf(req);
      if (type === 'SERVICE') {
        if (!req.providerId || req.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
      } else {
        const offer = await tx.serviceRequestProviderOffer.findUnique({
          where: {
            serviceRequestId_providerId: {
              serviceRequestId: req.id,
              providerId: actorProviderId,
            },
          },
          select: { status: true },
        });
        if (!offer || offer.status !== 'SELECTED') {
          throw new ForbiddenException('Provider is not selected for this request');
        }
      }

      if (isOrderPhaseStatus(req.status) || req.status === 'CLOSED') {
        throw new ConflictException('Request is not editable');
      }

      const next = await tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          dealTerms: input.dealTerms,
        },
        select,
      });

      await this.addEvent(tx, {
        serviceRequestId: req.id,
        type: 'TERMS_SET',
        actorProviderId,
        payload: input.dealTerms,
      });

      return next;
    });

    const counts = await this.getConversationCounts([updated.id]);
    return serviceRequestRowToProDtoPlain(
      updated as unknown as ServiceRequestDbRow,
      counts.get(updated.id) ?? 0,
      actorProviderId,
    );
  }

  async acceptTermsByCustomer(
    actorUserId: string,
    requestId: string,
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
      if (isOrderPhaseStatus(req.status) || req.status === 'CLOSED') {
        throw new ConflictException('Request is not editable');
      }
      if (!req.dealTerms) {
        throw new BadRequestException('Deal terms are required');
      }

      const next = await tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: 'TERMS_AGREED',
        },
        select,
      });

      await this.addEvent(tx, {
        serviceRequestId: req.id,
        type: 'TERMS_ACCEPTED',
        actorUserId,
      });

      return next;
    });

    return serviceRequestRowToCustomerDtoPlain(
      updated as unknown as ServiceRequestDbRow,
    );
  }

  async selectProviderByCustomer(
    actorUserId: string,
    requestId: string,
    input: { providerId: string },
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
      if (isOrderPhaseStatus(req.status) || req.status === 'CLOSED') {
        throw new ConflictException('Request is not editable');
      }
      if (req.status !== 'TERMS_AGREED') {
        throw new BadRequestException('Terms must be agreed before selecting provider');
      }

      const offer = await tx.serviceRequestProviderOffer.findUnique({
        where: {
          serviceRequestId_providerId: {
            serviceRequestId: req.id,
            providerId: input.providerId,
          },
        },
        select: { id: true },
      });
      if (!offer) {
        throw new BadRequestException('Provider is not selected in this request');
      }

      const now = new Date();
      await tx.serviceRequestProviderOffer.updateMany({
        where: { serviceRequestId: req.id, providerId: { not: input.providerId } },
        data: { status: 'DECLINED', declinedAt: now },
      });

      const next = await tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: 'PROVIDER_SELECTED',
          providerId: input.providerId,
          lockedAt: req.lockedAt ?? now,
        },
        select,
      });

      await this.addEvent(tx, {
        serviceRequestId: req.id,
        type: 'PROVIDER_SELECTED',
        actorUserId,
        payload: { providerId: input.providerId },
      });

      return next;
    });

    return serviceRequestRowToCustomerDtoPlain(
      updated as unknown as ServiceRequestDbRow,
    );
  }

  async acceptContractByCustomer(
    actorUserId: string,
    requestId: string,
    input: { offerVersion: string },
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
      if (req.status !== 'PROVIDER_SELECTED') {
        throw new BadRequestException('Provider must be selected before contract acceptance');
      }
      if (!req.providerId) {
        throw new ConflictException('Provider is required');
      }
      if (!req.dealTerms) {
        throw new ConflictException('Deal terms are required');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: 'CONTRACT_ACCEPTED',
          offerVersion: input.offerVersion,
          contractAcceptedAt: now,
          contractAcceptedByUserId: actorUserId,
        },
        select,
      });

      await this.addEvent(tx, {
        serviceRequestId: req.id,
        type: 'CONTRACT_ACCEPTED',
        actorUserId,
        payload: { offerVersion: input.offerVersion },
      });

      return next;
    });

    return serviceRequestRowToCustomerDtoPlain(
      updated as unknown as ServiceRequestDbRow,
    );
  }

  async payByCustomer(
    actorUserId: string,
    requestId: string,
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
      if (req.status !== 'CONTRACT_ACCEPTED' && req.status !== 'PAYMENT_PENDING') {
        throw new BadRequestException('Payment is not available for this status');
      }

      const next = await tx.serviceRequest.update({
        where: { id: req.id },
        data: {
          status: 'PAYMENT_PROCESSING',
        },
        select,
      });

      await this.addEvent(tx, {
        serviceRequestId: req.id,
        type: 'ESCROW_RESERVED',
        actorUserId,
      });

      return next;
    });

    return serviceRequestRowToCustomerDtoPlain(
      updated as unknown as ServiceRequestDbRow,
    );
  }
}

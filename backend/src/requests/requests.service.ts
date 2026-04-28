import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { InternalAuthService } from '../auth/internal-auth.service';
import type { OrderManagementAction } from '../auth/authorization';
import type {
  RequestCategoryCreateDto,
  RequestCustomerDto,
  RequestDbRow,
  RequestProDto,
  RequestServiceCreateDto,
  RequestUnlinkedCreateDto,
} from './dto/request.dto';
import {
  ORDER_STATUSES,
  EXCLUSIVE_PROVIDER_STATUSES,
  isExclusiveProviderStatus,
  requestRowToCustomerDtoPlain,
  requestRowToProDtoPlain,
} from './dto/request.dto';

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
  provider: { select: { name: true } },
  customerUser: { select: { customerCityId: true, name: true, email: true } },
  providerOffers: {
    select: {
      providerId: true,
      status: true,
      selectedAt: true,
      declinedAt: true,
    },
  },
  contractInstances: {
    select: {
      id: true,
      title: true,
      status: true,
      requestId: true,
      providerId: true,
      createdAt: true,
      updatedAt: true,
      commentThreads: {
        where: { status: 'OPEN' },
        select: { id: true },
        take: 100,
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
    take: 20,
  },
} satisfies Prisma.RequestSelect;

type SubjectType = 'SERVICE' | 'CATEGORY' | 'FREEFORM';
type InboxStatus = 'NEW' | 'DISCUSSING';
type DialogScope = 'ACTIVE' | 'ARCHIVE';

function subjectTypeOf(
  row: Pick<RequestDbRow, 'serviceId' | 'categoryId'>,
): SubjectType {
  if (row.serviceId) return 'SERVICE';
  if (row.categoryId) return 'CATEGORY';
  return 'FREEFORM';
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  private async addEvent(
    tx: Prisma.TransactionClient,
    input: {
      requestId: string;
      type: string;
      actorUserId?: string | null;
      actorProviderId?: string | null;
      payload?: Prisma.InputJsonValue | null;
    },
  ) {
    await tx.requestEvent.create({
      data: {
        requestId: input.requestId,
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
        requestId: { in: requestIds },
        messages: { some: {} },
      },
      select: { requestId: true },
      take: 5000,
    });

    for (const row of rows) {
      map.set(row.requestId, (map.get(row.requestId) ?? 0) + 1);
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
    rows: Array<Pick<RequestDbRow, 'id' | 'requestCityId' | 'customerUser'>>,
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
    row: Pick<RequestDbRow, 'serviceId' | 'categoryId'>,
  ) {
    if (row.serviceId && row.categoryId) {
      throw new ConflictException('Invalid request shape');
    }
  }

  private assertProviderEligibleForUnassignedRequest(
    actorProviderId: string,
    row: Pick<
      RequestDbRow,
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

  private async autoAcceptIfNeeded(
    tx: Prisma.TransactionClient,
    row: Prisma.RequestGetPayload<{ select: typeof select }>,
  ) {
    if (row.status !== 'ACCEPTANCE_PENDING') return row;
    if (!row.autoAcceptAt) return row;
    if (row.autoAcceptAt.getTime() > Date.now()) return row;

    const now = new Date();
    const updated = await tx.request.update({
      where: { id: row.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        acceptedByUserId: row.customerUserId,
      },
      select,
    });

    await this.addEvent(tx, {
      requestId: row.id,
      type: 'AUTO_ACCEPT',
      actorUserId: row.customerUserId,
      payload: { at: now.toISOString() },
    });

    return updated;
  }

  // --- Customer: create ---

  async createForCategory(
    categoryId: string,
    actorUserId: string,
    input: RequestCategoryCreateDto,
  ): Promise<RequestCustomerDto> {
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

    const created = await this.prisma.request.create({
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

    return requestRowToCustomerDtoPlain(created as unknown as RequestDbRow);
  }

  async createForService(
    serviceId: string,
    actorUserId: string | null,
    input: RequestServiceCreateDto,
  ): Promise<RequestCustomerDto> {
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

    const created = await this.prisma.request.create({
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

    return requestRowToCustomerDtoPlain(created as unknown as RequestDbRow);
  }

  async createUnlinked(
    actorUserId: string,
    input: RequestUnlinkedCreateDto,
  ): Promise<RequestCustomerDto> {
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

    const created = await this.prisma.request.create({
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

    return requestRowToCustomerDtoPlain(created as unknown as RequestDbRow);
  }

  // --- Customer: read ---

  async listMine(actorUserId: string): Promise<RequestCustomerDto[]> {
    const rows = await this.prisma.request.findMany({
      where: { customerUserId: actorUserId },
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) =>
      requestRowToCustomerDtoPlain(r as unknown as RequestDbRow),
    );
  }

  async getMineById(
    actorUserId: string,
    requestId: string,
  ): Promise<RequestCustomerDto> {
    const row = await this.prisma.request.findFirst({
      where: { id: requestId, customerUserId: actorUserId },
      select,
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }
    return requestRowToCustomerDtoPlain(row as unknown as RequestDbRow);
  }

  // --- Customer: order-phase actions ---

  async acceptResultByCustomer(
    actorUserId: string,
    id: string,
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({
        where: { id, customerUserId: actorUserId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const normalized = await this.autoAcceptIfNeeded(tx, current);
      if (normalized.status !== 'ACCEPTANCE_PENDING') {
        throw new ForbiddenException('Request is not awaiting acceptance');
      }

      const now = new Date();
      const next = await tx.request.update({
        where: { id: normalized.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: now,
          acceptedByUserId: actorUserId,
        },
        select,
      });

      await this.addEvent(tx, {
        requestId: normalized.id,
        type: 'ACCEPT_RESULT',
        actorUserId,
        payload: { at: now.toISOString() },
      });

      return next;
    });
    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async sendRemarksByCustomer(
    actorUserId: string,
    id: string,
    input: { remarks: string },
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({
        where: { id, customerUserId: actorUserId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const normalized = await this.autoAcceptIfNeeded(tx, current);
      if (normalized.status !== 'ACCEPTANCE_PENDING') {
        throw new ForbiddenException('Request is not awaiting acceptance');
      }

      const now = new Date();
      const next = await tx.request.update({
        where: { id: normalized.id },
        data: {
          status: 'ACTIVE',
          acceptanceRequestedAt: null,
          autoAcceptAt: null,
          acceptedAt: null,
          acceptedByUserId: null,
        },
        select,
      });

      await this.addEvent(tx, {
        requestId: normalized.id,
        type: 'REMARKS',
        actorUserId,
        payload: { remarks: input.remarks, at: now.toISOString() },
      });

      return next;
    });
    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  // --- Provider: read ---

  async listProFeed(actorProviderId: string): Promise<RequestProDto[]> {
    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const [assignedRows, unassignedRows, activeOtherRows] = await Promise.all([
      this.prisma.request.findMany({
        where: { providerId: actorProviderId },
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.request.findMany({
        where: {
          providerId: null,
          status: { in: ['NEW', 'DISCUSSING'] },
        },
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.request.findMany({
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
      this.resolveRequestsRegionCodes(
        unassignedRows as unknown as RequestDbRow[],
      ),
      this.resolveRequestsRegionCodes(
        activeOtherRows as unknown as RequestDbRow[],
      ),
    ]);
    const eligibleUnassigned: RequestDbRow[] = [];
    for (const row of unassignedRows as unknown as RequestDbRow[]) {
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

    const eligibleActiveOther: RequestDbRow[] = [];
    for (const row of activeOtherRows as unknown as RequestDbRow[]) {
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
      ...(assignedRows as unknown as RequestDbRow[]),
      ...eligibleUnassigned,
      ...eligibleActiveOther,
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 200);

    const ids = merged.map((r) => r.id);
    const counts = await this.getConversationCounts(ids);
    return merged.map((r) =>
      requestRowToProDtoPlain(r, counts.get(r.id) ?? 0, actorProviderId),
    );
  }

  async listProInbox(
    actorProviderId: string,
    input: {
      status?: InboxStatus;
      categoryId?: string | null;
      dialogScope?: DialogScope;
    },
  ): Promise<RequestProDto[]> {
    const status: InboxStatus = input.status ?? 'NEW';
    if (status !== 'NEW' && status !== 'DISCUSSING') {
      throw new BadRequestException('Invalid status');
    }

    const dialogScope: DialogScope =
      input.dialogScope === 'ARCHIVE' ? 'ARCHIVE' : 'ACTIVE';

    let categoryId: string | null | undefined = input.categoryId;
    if (typeof categoryId === 'string') {
      const trimmed = categoryId.trim();
      categoryId =
        trimmed.length === 0 || trimmed.toLowerCase() === 'null'
          ? null
          : trimmed;
    }
    if (
      categoryId !== undefined &&
      categoryId !== null &&
      !this.isUuid(categoryId)
    ) {
      throw new BadRequestException('Invalid categoryId');
    }

    if (status === 'DISCUSSING' && dialogScope === 'ARCHIVE') {
      const archiveWhere: Prisma.RequestWhereInput = {
        status: { in: [...EXCLUSIVE_PROVIDER_STATUSES] },
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

      const rows = await this.prisma.request.findMany({
        where: archiveWhere,
        select,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      });

      const ids = (rows as unknown as RequestDbRow[]).map((r) => r.id);
      const counts = await this.getConversationCounts(ids);
      return (rows as unknown as RequestDbRow[]).map((r) =>
        requestRowToProDtoPlain(r, counts.get(r.id) ?? 0, actorProviderId, {
          revealMessageForLocked: true,
        }),
      );
    }

    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const perProviderConversationHasMessages: Prisma.RequestWhereInput =
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

    const categoryWhere =
      categoryId === undefined
        ? {}
        : categoryId === null
          ? { categoryId: null }
          : { categoryId };

    // 1) Requests assigned to this provider (e.g. SERVICE requests, or after customer selected the provider).
    const assignedRows = await this.prisma.request.findMany({
      where: {
        providerId: actorProviderId,
        ...categoryWhere,
        ...perProviderConversationHasMessages,
      },
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    // 2) Unassigned pool — only those the provider is eligible to see.
    const poolRows = await this.prisma.request.findMany({
      where: {
        providerId: null,
        serviceId: null,
        status: { in: ['NEW', 'DISCUSSING'] },
        ...categoryWhere,
        ...perProviderConversationHasMessages,
      },
      select,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const regionById = await this.resolveRequestsRegionCodes(
      poolRows as unknown as RequestDbRow[],
    );
    const eligiblePool: RequestDbRow[] = [];
    for (const row of poolRows as unknown as RequestDbRow[]) {
      try {
        this.assertProviderEligibleForUnassignedRequest(
          actorProviderId,
          row,
          providerRegionCode,
          eligibleCategoryIds,
          regionById,
        );
        eligiblePool.push(row);
      } catch {
        // not eligible
      }
    }

    const merged = [
      ...(assignedRows as unknown as RequestDbRow[]),
      ...eligiblePool,
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 200);

    const ids = merged.map((r) => r.id);
    const counts = await this.getConversationCounts(ids);
    return merged.map((r) =>
      requestRowToProDtoPlain(r, counts.get(r.id) ?? 0, actorProviderId),
    );
  }

  async listProEligibleCategories(
    actorProviderId: string,
  ): Promise<Array<{ id: string; name: string; slug: string }>> {
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

  async getProById(
    actorProviderId: string,
    requestId: string,
  ): Promise<RequestProDto> {
    const [providerRegionCode, eligibleCategoryIds] = await Promise.all([
      this.getProviderRegionCode(actorProviderId),
      this.getProviderEligibleCategoryIds(actorProviderId),
    ]);

    const row = await this.prisma.request.findUnique({
      where: { id: requestId },
      select,
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }

    const req = row as unknown as RequestDbRow;
    this.assertRequestShape(req);

    const lockedToOtherProvider =
      isExclusiveProviderStatus(req.status) &&
      Boolean(req.providerId) &&
      req.providerId !== actorProviderId;

    if (lockedToOtherProvider) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          requestId: req.id,
          providerId: actorProviderId,
          messages: { some: {} },
        },
        select: { id: true },
      });
      if (!existing) {
        throw new ForbiddenException('Request is locked');
      }
      const counts = await this.getConversationCounts([req.id]);
      return requestRowToProDtoPlain(
        req,
        counts.get(req.id) ?? 0,
        actorProviderId,
        { revealMessageForLocked: true },
      );
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
    return requestRowToProDtoPlain(req, counts.get(req.id) ?? 0, actorProviderId);
  }

  async getOrders(scope?: {
    providerId?: string | null;
  }): Promise<RequestCustomerDto[]> {
    const rows = await this.prisma.request.findMany({
      where: scope?.providerId
        ? {
            providerId: scope.providerId,
            status: { in: [...ORDER_STATUSES] },
          }
        : { status: { in: [...ORDER_STATUSES] } },
      select,
      orderBy: [{ createdAt: 'desc' }],
    });

    const normalized = await this.prisma.$transaction(async (tx) => {
      const out: typeof rows = [];
      for (const row of rows) out.push(await this.autoAcceptIfNeeded(tx, row));
      return out;
    });

    return normalized.map((r) =>
      requestRowToCustomerDtoPlain(r as unknown as RequestDbRow),
    );
  }

  async getOrderById(
    id: string,
    scope?: { providerId?: string | null },
  ): Promise<RequestCustomerDto> {
    const row = await this.prisma.request.findFirst({
      where: scope?.providerId
        ? {
            id,
            providerId: scope.providerId,
            status: { in: [...ORDER_STATUSES] },
          }
        : { id, status: { in: [...ORDER_STATUSES] } },
      select,
    });

    if (!row) {
      throw new NotFoundException('Request not found');
    }

    const normalized = await this.prisma.$transaction((tx) =>
      this.autoAcceptIfNeeded(tx, row),
    );
    return requestRowToCustomerDtoPlain(normalized as unknown as RequestDbRow);
  }

  // --- Provider: inbox settings ---

  async getProInboxSettings(
    actorUserId: string,
    actorProviderId: string,
  ): Promise<{
    status: InboxStatus;
    categoryId: string | null;
    dialogScope: DialogScope;
  }> {
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
  ): Promise<{
    status: InboxStatus;
    categoryId: string | null;
    dialogScope: DialogScope;
  }> {
    const status: InboxStatus = input.status ?? 'NEW';
    if (status !== 'NEW' && status !== 'DISCUSSING') {
      throw new BadRequestException('Invalid status');
    }

    const dialogScope: DialogScope =
      input.dialogScope === 'ARCHIVE' ? 'ARCHIVE' : 'ACTIVE';

    let categoryId: string | null | undefined = input.categoryId;
    if (typeof categoryId === 'string') {
      const trimmed = categoryId.trim();
      categoryId =
        trimmed.length === 0 || trimmed.toLowerCase() === 'null'
          ? null
          : trimmed;
    }
    if (
      categoryId !== undefined &&
      categoryId !== null &&
      !this.isUuid(categoryId)
    ) {
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

  // --- Provider: state machine actions ---

  async initiateOrderByCustomer(
    actorUserId: string,
    requestId: string,
    input: { conversationId: string },
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const req = current as unknown as RequestDbRow;
      this.assertRequestShape(req);

      if (req.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }

      if (isExclusiveProviderStatus(req.status)) {
        throw new ConflictException('Request already converted to order');
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      const conv = await tx.conversation.findFirst({
        where: {
          id: input.conversationId,
          requestId: req.id,
          customerUserId: actorUserId,
        },
        select: { providerId: true },
      });
      if (!conv) {
        throw new NotFoundException('Conversation not found');
      }

      const providerId = conv.providerId;
      const now = new Date();

      await tx.requestProviderOffer.upsert({
        where: {
          requestId_providerId: { requestId: req.id, providerId },
        },
        create: {
          requestId: req.id,
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

      const refreshed = await tx.request.findUnique({
        where: { id: req.id },
        select,
      });
      if (!refreshed) throw new NotFoundException('Request not found');
      return refreshed;
    });

    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async declineOfferByProvider(
    actorProviderId: string,
    requestId: string,
  ): Promise<RequestProDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const req = current as unknown as RequestDbRow;
      this.assertRequestShape(req);

      if (
        isExclusiveProviderStatus(req.status) &&
        req.status !== 'PROVIDER_SELECTED'
      ) {
        throw new ConflictException('Request already converted to order');
      }
      if (req.status === 'CLOSED') {
        throw new ConflictException('Request is closed');
      }

      const offer = await tx.requestProviderOffer.findUnique({
        where: {
          requestId_providerId: {
            requestId: req.id,
            providerId: actorProviderId,
          },
        },
        select: { id: true, status: true },
      });
      if (!offer || offer.status !== 'SELECTED') {
        throw new BadRequestException('No active offer to decline');
      }

      const now = new Date();
      await tx.requestProviderOffer.update({
        where: { id: offer.id },
        data: { status: 'DECLINED', declinedAt: now },
        select: { id: true },
      });

      if (req.status === 'PROVIDER_SELECTED') {
        if (req.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
        await tx.request.update({
          where: { id: req.id },
          data: {
            status: 'DISCUSSING',
            providerId: null,
            lockedAt: null,
            offerVersion: null,
            contractAcceptedAt: null,
            contractAcceptedByUserId: null,
          },
          select: { id: true },
        });

        await this.addEvent(tx, {
          requestId: req.id,
          type: 'PROVIDER_DECLINED_AFTER_SELECTION',
          actorProviderId,
          payload: { at: now.toISOString() },
        });
      }

      const refreshed = await tx.request.findUnique({
        where: { id: req.id },
        select,
      });
      if (!refreshed) throw new NotFoundException('Request not found');
      return refreshed;
    });

    const counts = await this.getConversationCounts([updated.id]);
    return requestRowToProDtoPlain(
      updated as unknown as RequestDbRow,
      counts.get(updated.id) ?? 0,
      actorProviderId,
    );
  }

  async setTermsByProvider(
    actorProviderId: string,
    requestId: string,
    input: { dealTerms: Prisma.InputJsonValue },
  ): Promise<RequestProDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      const req = current as unknown as RequestDbRow;
      this.assertRequestShape(req);

      const type = subjectTypeOf(req);
      if (type === 'SERVICE') {
        if (!req.providerId || req.providerId !== actorProviderId) {
          throw new ForbiddenException('Forbidden');
        }
      } else {
        const offer = await tx.requestProviderOffer.findUnique({
          where: {
            requestId_providerId: {
              requestId: req.id,
              providerId: actorProviderId,
            },
          },
          select: { status: true },
        });
        if (!offer || offer.status !== 'SELECTED') {
          throw new ForbiddenException(
            'Provider is not selected for this request',
          );
        }
      }

      if (isExclusiveProviderStatus(req.status) || req.status === 'CLOSED') {
        throw new ConflictException('Request is not editable');
      }

      const next = await tx.request.update({
        where: { id: req.id },
        data: {
          dealTerms: input.dealTerms,
        },
        select,
      });

      await this.addEvent(tx, {
        requestId: req.id,
        type: 'TERMS_SET',
        actorProviderId,
        payload: input.dealTerms,
      });

      return next;
    });

    const counts = await this.getConversationCounts([updated.id]);
    return requestRowToProDtoPlain(
      updated as unknown as RequestDbRow,
      counts.get(updated.id) ?? 0,
      actorProviderId,
    );
  }

  async acceptTermsByCustomer(
    actorUserId: string,
    requestId: string,
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      const req = current as unknown as RequestDbRow;
      this.assertRequestShape(req);

      if (req.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }
      if (isExclusiveProviderStatus(req.status) || req.status === 'CLOSED') {
        throw new ConflictException('Request is not editable');
      }
      if (!req.dealTerms) {
        throw new BadRequestException('Deal terms are required');
      }

      const next = await tx.request.update({
        where: { id: req.id },
        data: {
          status: 'TERMS_AGREED',
        },
        select,
      });

      await this.addEvent(tx, {
        requestId: req.id,
        type: 'TERMS_ACCEPTED',
        actorUserId,
      });

      return next;
    });

    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async selectProviderByCustomer(
    actorUserId: string,
    requestId: string,
    input: { providerId: string },
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      const req = current as unknown as RequestDbRow;
      this.assertRequestShape(req);

      if (req.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }
      if (isExclusiveProviderStatus(req.status) || req.status === 'CLOSED') {
        throw new ConflictException('Request is not editable');
      }
      if (
        req.status !== 'NEW' &&
        req.status !== 'DISCUSSING' &&
        req.status !== 'TERMS_AGREED'
      ) {
        throw new BadRequestException('Invalid status');
      }

      // Customer may select a provider directly from an existing conversation
      // (even if an explicit offer record was not created yet).
      const [offer, conv] = await Promise.all([
        tx.requestProviderOffer.findUnique({
          where: {
            requestId_providerId: {
              requestId: req.id,
              providerId: input.providerId,
            },
          },
          select: { id: true },
        }),
        tx.conversation.findFirst({
          where: {
            requestId: req.id,
            providerId: input.providerId,
            customerUserId: actorUserId,
          },
          select: { id: true },
        }),
      ]);

      if (!offer && !conv) {
        throw new BadRequestException('Conversation not found');
      }

      const now = new Date();
      if (!offer) {
        await tx.requestProviderOffer.upsert({
          where: {
            requestId_providerId: {
              requestId: req.id,
              providerId: input.providerId,
            },
          },
          create: {
            requestId: req.id,
            providerId: input.providerId,
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
      }

      await tx.requestProviderOffer.updateMany({
        where: {
          requestId: req.id,
          providerId: { not: input.providerId },
        },
        data: { status: 'DECLINED', declinedAt: now },
      });

      const next = await tx.request.update({
        where: { id: req.id },
        data: {
          status: 'PROVIDER_SELECTED',
          providerId: input.providerId,
          lockedAt: req.lockedAt ?? now,
        },
        select,
      });

      await this.addEvent(tx, {
        requestId: req.id,
        type: 'PROVIDER_SELECTED',
        actorUserId,
        payload: { providerId: input.providerId },
      });

      return next;
    });

    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async acceptContractByCustomer(
    actorUserId: string,
    requestId: string,
    input: { offerVersion: string },
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findUnique({
        where: { id: requestId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      const req = current as unknown as RequestDbRow;
      this.assertRequestShape(req);

      if (req.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }
      if (req.status !== 'PROVIDER_SELECTED') {
        throw new BadRequestException(
          'Provider must be selected before contract acceptance',
        );
      }
      if (!req.providerId) {
        throw new ConflictException('Provider is required');
      }
      if (!req.dealTerms) {
        throw new ConflictException('Deal terms are required');
      }

      const now = new Date();
      const next = await tx.request.update({
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
        requestId: req.id,
        type: 'CONTRACT_ACCEPTED',
        actorUserId,
        payload: { offerVersion: input.offerVersion },
      });

      return next;
    });

    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async startWorkByProvider(
    actorProviderId: string,
    id: string,
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({
        where: { id, providerId: actorProviderId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');

      if (current.status !== 'PAYMENT_PROCESSING') {
        throw new ForbiddenException(
          'Escrow must be reserved before starting work',
        );
      }

      const now = new Date();
      const next = await tx.request.update({
        where: { id: current.id },
        data: { status: 'ACTIVE' },
        select,
      });

      await this.addEvent(tx, {
        requestId: current.id,
        type: 'START_WORK',
        actorProviderId,
        payload: { at: now.toISOString() },
      });

      return next;
    });

    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async markServiceRenderedByProvider(
    actorProviderId: string,
    id: string,
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({
        where: { id, providerId: actorProviderId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      if (current.status !== 'ACTIVE') {
        throw new ForbiddenException('Request must be in work');
      }

      const now = new Date();
      const next = await tx.request.update({
        where: { id: current.id },
        data: { status: 'SERVICE_RENDERED' },
        select,
      });

      await this.addEvent(tx, {
        requestId: current.id,
        type: 'SERVICE_RENDERED',
        actorProviderId,
        payload: { at: now.toISOString() },
      });

      return next;
    });
    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async requestAcceptanceByProvider(
    actorProviderId: string,
    id: string,
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({
        where: { id, providerId: actorProviderId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      if (current.status !== 'SERVICE_RENDERED') {
        throw new ForbiddenException(
          'Request must be rendered before acceptance',
        );
      }

      const now = new Date();
      const autoAcceptAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const next = await tx.request.update({
        where: { id: current.id },
        data: {
          status: 'ACCEPTANCE_PENDING',
          acceptanceRequestedAt: now,
          autoAcceptAt,
        },
        select,
      });

      await this.addEvent(tx, {
        requestId: current.id,
        type: 'ACCEPTANCE_REQUESTED',
        actorProviderId,
        payload: {
          at: now.toISOString(),
          autoAcceptAt: autoAcceptAt.toISOString(),
        },
      });

      return next;
    });
    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  async completeByProvider(
    actorProviderId: string,
    id: string,
  ): Promise<RequestCustomerDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.request.findFirst({
        where: { id, providerId: actorProviderId },
        select,
      });
      if (!current) throw new NotFoundException('Request not found');
      if (current.status !== 'PAID') {
        throw new ForbiddenException(
          'Request must be paid out before completion',
        );
      }

      const now = new Date();
      const next = await tx.request.update({
        where: { id: current.id },
        data: { status: 'COMPLETED' },
        select,
      });

      await this.addEvent(tx, {
        requestId: current.id,
        type: 'COMPLETE',
        actorProviderId,
        payload: { at: now.toISOString() },
      });
      return next;
    });
    return requestRowToCustomerDtoPlain(updated as unknown as RequestDbRow);
  }

  // --- Auth helpers (for controller use) ---

  async getManagementContext(
    request: ExpressRequest,
    action: OrderManagementAction,
  ) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    try {
      return await this.authService.getOrderManagementContext(userId, action);
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

  getRequiredActorUserId(request: ExpressRequest) {
    return this.internalAuthService.getUserIdFromRequest(request);
  }

  getOptionalActorUserId(request: ExpressRequest) {
    return this.internalAuthService.getOptionalUserIdFromRequest(request);
  }

  async requireProviderContext(request: ExpressRequest) {
    const userId = this.internalAuthService.getUserIdFromRequest(request);
    const ctx = await this.authService.getServiceManagementContext(
      userId,
      'read',
    );
    if (ctx.isPlatformAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    if (!ctx.providerId) {
      throw new NotFoundException('Active provider is required');
    }
    return { ...ctx, providerId: ctx.providerId };
  }
}

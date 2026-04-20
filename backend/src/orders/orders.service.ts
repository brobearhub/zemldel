import {
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
import { type OrderDto } from './dto/order.dto';
import type { OrderManagementAction } from '../auth/authorization';

const orderRequestSelect = {
  id: true,
  serviceId: true,
  providerId: true,
  customerUserId: true,
  status: true,
  dealTerms: true,
  acceptanceRequestedAt: true,
  autoAcceptAt: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
  service: {
    select: {
      title: true,
    },
  },
  provider: {
    select: {
      name: true,
    },
  },
  customerUser: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.ServiceRequestSelect;

const ORDER_STATUSES = [
  'CONTRACT_ACCEPTED',
  'PAYMENT_PENDING',
  'PAYMENT_PROCESSING',
  'ACTIVE',
  'SERVICE_RENDERED',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'PAID',
  'COMPLETED',
  'CANCELLED',
] as const;

type OrderScope = {
  providerId?: string | null;
};

function normalizeOrderStatus(
  value: unknown,
): (typeof ORDER_STATUSES)[number] {
  if (value === 'CONTRACT_ACCEPTED') return 'CONTRACT_ACCEPTED';
  if (value === 'PAYMENT_PENDING') return 'PAYMENT_PENDING';
  if (value === 'PAYMENT_PROCESSING') return 'PAYMENT_PROCESSING';
  if (value === 'SERVICE_RENDERED') return 'SERVICE_RENDERED';
  if (value === 'ACCEPTANCE_PENDING') return 'ACCEPTANCE_PENDING';
  if (value === 'ACCEPTED') return 'ACCEPTED';
  if (value === 'PAID') return 'PAID';
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'CANCELLED') return 'CANCELLED';
  return 'ACTIVE';
}

function requestRowToOrderDto(
  row: Prisma.ServiceRequestGetPayload<{ select: typeof orderRequestSelect }>,
): OrderDto {
  return {
    id: row.id,
    serviceId: row.serviceId!,
    providerId: row.providerId!,
    customerUserId: row.customerUserId!,
    status: normalizeOrderStatus(row.status),
    serviceTitle: row.service?.title ?? '',
    providerName: row.provider?.name ?? '',
    customerName: row.customerUser?.name ?? null,
    customerEmail: row.customerUser?.email ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    dealTerms: (row as any).dealTerms ?? null,
    acceptanceRequestedAt: row.acceptanceRequestedAt
      ? row.acceptanceRequestedAt.toISOString()
      : null,
    autoAcceptAt: row.autoAcceptAt ? row.autoAcceptAt.toISOString() : null,
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

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

  private async autoAcceptIfNeeded(
    tx: Prisma.TransactionClient,
    row: Prisma.ServiceRequestGetPayload<{ select: typeof orderRequestSelect }>,
  ) {
    if (row.status !== 'ACCEPTANCE_PENDING') return row;
    if (!row.autoAcceptAt) return row;
    if (row.autoAcceptAt.getTime() > Date.now()) return row;

    const now = new Date();
    const updated = await tx.serviceRequest.update({
      where: { id: row.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        acceptedByUserId: row.customerUserId,
      },
      select: orderRequestSelect,
    });

    await this.addEvent(tx, {
      serviceRequestId: row.id,
      type: 'AUTO_ACCEPT',
      actorUserId: row.customerUserId,
      payload: { at: now.toISOString() },
    });

    return updated;
  }

  async getCustomerOrders(customerUserId: string): Promise<OrderDto[]> {
    const rows: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }>[] = await this.prisma.serviceRequest.findMany({
      where: {
        customerUserId,
        status: { in: [...ORDER_STATUSES] },
      },
      select: orderRequestSelect,
      orderBy: [{ createdAt: 'desc' }],
    });
    const normalized = await this.prisma.$transaction(async (tx) => {
      const out: typeof rows = [];
      for (const row of rows) {
        out.push(await this.autoAcceptIfNeeded(tx, row));
      }
      return out;
    });

    return normalized.map((row) => requestRowToOrderDto(row));
  }

  async getCustomerOrderById(
    customerUserId: string,
    id: string,
  ): Promise<OrderDto> {
    const row: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }> | null = await this.prisma.serviceRequest.findFirst({
      where: {
        id,
        customerUserId,
        status: { in: [...ORDER_STATUSES] },
      },
      select: orderRequestSelect,
    });

    if (!row) {
      throw new NotFoundException('Order not found');
    }

    const normalized = await this.prisma.$transaction((tx) =>
      this.autoAcceptIfNeeded(tx, row),
    );
    return requestRowToOrderDto(normalized);
  }

  async getOrders(scope?: OrderScope): Promise<OrderDto[]> {
    const rows: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }>[] = await this.prisma.serviceRequest.findMany({
      where: scope?.providerId
        ? {
            providerId: scope.providerId,
            status: { in: [...ORDER_STATUSES] },
          }
        : { status: { in: [...ORDER_STATUSES] } },
      select: orderRequestSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    const normalized = await this.prisma.$transaction(async (tx) => {
      const out: typeof rows = [];
      for (const row of rows) out.push(await this.autoAcceptIfNeeded(tx, row));
      return out;
    });

    return normalized.map((row) => requestRowToOrderDto(row));
  }

  async getOrderById(id: string, scope?: OrderScope): Promise<OrderDto> {
    const row: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }> | null = await this.prisma.serviceRequest.findFirst({
      where: scope?.providerId
        ? {
            id,
            providerId: scope.providerId,
            status: { in: [...ORDER_STATUSES] },
          }
        : { id, status: { in: [...ORDER_STATUSES] } },
      select: orderRequestSelect,
    });

    if (!row) {
      throw new NotFoundException('Order not found');
    }

    const normalized = await this.prisma.$transaction((tx) =>
      this.autoAcceptIfNeeded(tx, row),
    );
    return requestRowToOrderDto(normalized);
  }

  async acceptResultByCustomer(actorUserId: string, id: string): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, customerUserId: actorUserId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');

      const normalized = await this.autoAcceptIfNeeded(tx, current);
      if (normalized.status !== 'ACCEPTANCE_PENDING') {
        throw new ForbiddenException('Order is not awaiting acceptance');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: normalized.id },
        data: { status: 'ACCEPTED', acceptedAt: now, acceptedByUserId: actorUserId },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: normalized.id,
        type: 'ACCEPT_RESULT',
        actorUserId,
        payload: { at: now.toISOString() },
      });

      return next;
    });
    return requestRowToOrderDto(updated);
  }

  async sendRemarksByCustomer(
    actorUserId: string,
    id: string,
    input: { remarks: string },
  ): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, customerUserId: actorUserId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');

      const normalized = await this.autoAcceptIfNeeded(tx, current);
      if (normalized.status !== 'ACCEPTANCE_PENDING') {
        throw new ForbiddenException('Order is not awaiting acceptance');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: normalized.id },
        data: {
          status: 'ACTIVE',
          acceptanceRequestedAt: null,
          autoAcceptAt: null,
          acceptedAt: null,
          acceptedByUserId: null,
        },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: normalized.id,
        type: 'REMARKS',
        actorUserId,
        payload: { remarks: input.remarks, at: now.toISOString() },
      });

      return next;
    });
    return requestRowToOrderDto(updated);
  }

  async startWorkByProvider(actorProviderId: string, id: string): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, providerId: actorProviderId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');

      if (current.status !== 'PAYMENT_PROCESSING') {
        throw new ForbiddenException('Escrow must be reserved before starting work');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: current.id },
        data: { status: 'ACTIVE' },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: current.id,
        type: 'START_WORK',
        actorProviderId,
        payload: { at: now.toISOString() },
      });

      return next;
    });

    return requestRowToOrderDto(updated);
  }

  async markServiceRenderedByProvider(actorProviderId: string, id: string): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, providerId: actorProviderId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');
      if (current.status !== 'ACTIVE') {
        throw new ForbiddenException('Order must be in work');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: current.id },
        data: { status: 'SERVICE_RENDERED' },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: current.id,
        type: 'SERVICE_RENDERED',
        actorProviderId,
        payload: { at: now.toISOString() },
      });

      return next;
    });
    return requestRowToOrderDto(updated);
  }

  async requestAcceptanceByProvider(actorProviderId: string, id: string): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, providerId: actorProviderId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');
      if (current.status !== 'SERVICE_RENDERED') {
        throw new ForbiddenException('Order must be rendered before acceptance');
      }

      const now = new Date();
      const autoAcceptAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const next = await tx.serviceRequest.update({
        where: { id: current.id },
        data: {
          status: 'ACCEPTANCE_PENDING',
          acceptanceRequestedAt: now,
          autoAcceptAt,
        },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: current.id,
        type: 'ACCEPTANCE_REQUESTED',
        actorProviderId,
        payload: { at: now.toISOString(), autoAcceptAt: autoAcceptAt.toISOString() },
      });

      return next;
    });
    return requestRowToOrderDto(updated);
  }

  async payoutByProvider(actorProviderId: string, id: string): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, providerId: actorProviderId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');

      const normalized = await this.autoAcceptIfNeeded(tx, current);
      if (normalized.status !== 'ACCEPTED') {
        throw new ForbiddenException('Order must be accepted before payout');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: normalized.id },
        data: { status: 'PAID' },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: normalized.id,
        type: 'PAYOUT',
        actorProviderId,
        payload: { at: now.toISOString() },
      });
      return next;
    });
    return requestRowToOrderDto(updated);
  }

  async completeByProvider(actorProviderId: string, id: string): Promise<OrderDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.serviceRequest.findFirst({
        where: { id, providerId: actorProviderId },
        select: orderRequestSelect,
      });
      if (!current) throw new NotFoundException('Order not found');
      if (current.status !== 'PAID') {
        throw new ForbiddenException('Order must be paid out before completion');
      }

      const now = new Date();
      const next = await tx.serviceRequest.update({
        where: { id: current.id },
        data: { status: 'COMPLETED' },
        select: orderRequestSelect,
      });

      await this.addEvent(tx, {
        serviceRequestId: current.id,
        type: 'COMPLETE',
        actorProviderId,
        payload: { at: now.toISOString() },
      });
      return next;
    });
    return requestRowToOrderDto(updated);
  }

  async getManagementContext(request: Request, action: OrderManagementAction) {
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

  getRequiredActorUserId(request: Request) {
    return this.internalAuthService.getUserIdFromRequest(request);
  }
}

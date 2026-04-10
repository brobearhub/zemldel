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

type OrderScope = {
  providerId?: string | null;
};

function normalizeOrderStatus(
  value: unknown,
): 'ACTIVE' | 'COMPLETED' | 'CANCELLED' {
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
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly internalAuthService: InternalAuthService,
  ) {}

  async getCustomerOrders(customerUserId: string): Promise<OrderDto[]> {
    const rows: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }>[] = await this.prisma.serviceRequest.findMany({
      where: {
        customerUserId,
        status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
      },
      select: orderRequestSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => requestRowToOrderDto(row));
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
        status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
      },
      select: orderRequestSelect,
    });

    if (!row) {
      throw new NotFoundException('Order not found');
    }

    return requestRowToOrderDto(row);
  }

  async getOrders(scope?: OrderScope): Promise<OrderDto[]> {
    const rows: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }>[] = await this.prisma.serviceRequest.findMany({
      where: scope?.providerId
        ? {
            providerId: scope.providerId,
            status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
          }
        : { status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] } },
      select: orderRequestSelect,
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => requestRowToOrderDto(row));
  }

  async getOrderById(id: string, scope?: OrderScope): Promise<OrderDto> {
    const row: Prisma.ServiceRequestGetPayload<{
      select: typeof orderRequestSelect;
    }> | null = await this.prisma.serviceRequest.findFirst({
      where: scope?.providerId
        ? {
            id,
            providerId: scope.providerId,
            status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
          }
        : { id, status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] } },
      select: orderRequestSelect,
    });

    if (!row) {
      throw new NotFoundException('Order not found');
    }

    return requestRowToOrderDto(row);
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

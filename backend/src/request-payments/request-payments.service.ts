import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  hasRequestLock,
  isExclusiveForActorProvider,
  type RequestPaymentType,
  type RequestPaymentItemDto,
} from '../requests/dto/request.dto';
import {
  remainingKopecks,
  sumPaidKopecksByType,
  type PaymentAmountWithTypeAndPaidAt,
} from '../requests/dto/request-finance';
import type { RequestFinanceDto } from './dto/request-payments.dto';

const CLOSED_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CLOSED']);

const paymentSelect = {
  id: true,
  type: true,
  amountKopecks: true,
  comment: true,
  paidAt: true,
  createdAt: true,
} as const;

type PaymentRow = {
  id: string;
  type: RequestPaymentType;
  amountKopecks: number;
  comment: string;
  paidAt: Date | null;
  createdAt: Date;
};

function toPaymentDto(row: PaymentRow): RequestPaymentItemDto {
  return {
    id: row.id,
    type: row.type,
    amountKopecks: row.amountKopecks,
    comment: row.comment,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toFinanceDto(
  totalAmountKopecks: number | null,
  payments: PaymentRow[],
): RequestFinanceDto {
  const paidAmountKopecks = sumPaidKopecksByType(payments as unknown as PaymentAmountWithTypeAndPaidAt[], 'CONTRACT');
  return {
    totalAmountKopecks,
    paidAmountKopecks,
    remainingAmountKopecks: remainingKopecks(totalAmountKopecks, paidAmountKopecks),
    payments: payments.map(toPaymentDto),
  };
}

@Injectable()
export class RequestPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private async requireProviderId(actorUserId: string) {
    const ctx = await this.authService.getServiceManagementContext(actorUserId, 'read');
    if (ctx.isPlatformAdmin) throw new ForbiddenException('Forbidden');
    if (!ctx.providerId) throw new NotFoundException('Active provider is required');
    return ctx.providerId;
  }

  private async loadExclusiveRequest(input: { providerId: string; requestId: string }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        providerId: true,
        lockedAt: true,
        totalAmountKopecks: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!isExclusiveForActorProvider(request, input.providerId)) {
      throw new ForbiddenException('Forbidden');
    }
    return request;
  }

  private assertWritable(status: string) {
    if (CLOSED_STATUSES.has(status)) {
      throw new ForbiddenException('Finance cannot be changed after the request is closed');
    }
  }

  async getForProvider(input: { actorUserId: string; requestId: string }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadExclusiveRequest({ providerId, requestId: input.requestId });
    return toFinanceDto(request.totalAmountKopecks, request.payments);
  }

  async getForCustomer(input: { actorUserId: string; requestId: string }): Promise<RequestFinanceDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: {
        lockedAt: true,
        totalAmountKopecks: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!hasRequestLock(request)) {
      return toFinanceDto(null, []);
    }
    return toFinanceDto(request.totalAmountKopecks, request.payments);
  }

  async setTotalForProvider(input: {
    actorUserId: string;
    requestId: string;
    totalAmountKopecks: number;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadExclusiveRequest({ providerId, requestId: input.requestId });
    this.assertWritable(request.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.request.update({
        where: { id: request.id },
        data: { totalAmountKopecks: input.totalAmountKopecks },
        select: {
          totalAmountKopecks: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'FINANCE_TOTAL_SET',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          payload: { totalAmountKopecks: input.totalAmountKopecks },
        },
      });
      return next;
    });

    return toFinanceDto(updated.totalAmountKopecks, updated.payments);
  }

  async addPaymentForProvider(input: {
    actorUserId: string;
    requestId: string;
    amountKopecks: number;
    comment: string;
    type?: RequestPaymentType;
    paidAt?: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadExclusiveRequest({ providerId, requestId: input.requestId });
    this.assertWritable(request.status);

    const comment = input.comment.trim();
    if (comment.length < 1) throw new BadRequestException('Comment is required');

    const type: RequestPaymentType = input.type ?? 'CONTRACT';
    const paidAt = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.requestPayment.create({
        data: {
          requestId: request.id,
          providerId,
          type,
          amountKopecks: input.amountKopecks,
          comment,
          paidAt,
          createdByUserId: input.actorUserId,
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'PAYMENT_ADDED',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          payload: { amountKopecks: input.amountKopecks, comment, type },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountKopecks: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });

    return toFinanceDto(updated.totalAmountKopecks, updated.payments);
  }

  async markPaymentPaidForProvider(input: {
    actorUserId: string;
    requestId: string;
    paymentId: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadExclusiveRequest({ providerId, requestId: input.requestId });
    this.assertWritable(request.status);

    const payment = request.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt != null) throw new BadRequestException('Payment is already marked as paid');

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.requestPayment.updateMany({
        where: { id: input.paymentId, requestId: request.id, paidAt: null },
        data: { paidAt: now },
      });
      if (changed.count !== 1) throw new BadRequestException('Payment is already marked as paid');

      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'PAYMENT_MARKED_PAID',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          payload: {
            paymentId: payment.id,
            amountKopecks: payment.amountKopecks,
            comment: payment.comment,
            type: payment.type,
            paidAt: now.toISOString(),
          },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountKopecks: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });

    return toFinanceDto(updated.totalAmountKopecks, updated.payments);
  }

  async markPaymentPaidForCustomer(input: {
    actorUserId: string;
    requestId: string;
    paymentId: string;
  }): Promise<RequestFinanceDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: {
        id: true,
        status: true,
        providerId: true,
        lockedAt: true,
        totalAmountKopecks: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!hasRequestLock(request) || !request.providerId) {
      throw new ForbiddenException('Payments can be marked as paid only after the request is locked');
    }
    this.assertWritable(request.status);

    const payment = request.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt != null) throw new BadRequestException('Payment is already marked as paid');

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.requestPayment.updateMany({
        where: { id: input.paymentId, requestId: request.id, paidAt: null },
        data: { paidAt: now },
      });
      if (changed.count !== 1) throw new BadRequestException('Payment is already marked as paid');

      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'PAYMENT_MARKED_PAID',
          actorUserId: input.actorUserId,
          actorProviderId: request.providerId!,
          payload: {
            paymentId: payment.id,
            amountKopecks: payment.amountKopecks,
            comment: payment.comment,
            type: payment.type,
            paidAt: now.toISOString(),
          },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountKopecks: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });

    return toFinanceDto(updated.totalAmountKopecks, updated.payments);
  }
}

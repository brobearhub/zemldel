import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  type RequestPaymentType,
  type RequestPaymentItemDto,
} from '../requests/dto/request.dto';
import {
  remainingRubles,
  sumPaidRublesByType,
  type PaymentAmountWithTypeAndPaidAt,
} from '../requests/dto/request-finance';
import { formatRubles } from '../requests/lib/service-price-rubles';
import { ChatService } from '../chat/chat.service';
import type { RequestFinanceDto } from './dto/request-payments.dto';

const CLOSED_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CLOSED']);

const paymentSelect = {
  id: true,
  type: true,
  amountRubles: true,
  comment: true,
  paidAt: true,
  createdAt: true,
  createdByUserId: true,
} as const;

type PaymentRow = {
  id: string;
  type: RequestPaymentType;
  amountRubles: number;
  comment: string;
  paidAt: Date | null;
  createdAt: Date;
  createdByUserId: string | null;
};

function authorSide(
  createdByUserId: string | null,
  customerUserId: string | null,
): 'CUSTOMER' | 'PROVIDER' | null {
  if (!createdByUserId) return null;
  if (customerUserId && createdByUserId === customerUserId) return 'CUSTOMER';
  return 'PROVIDER';
}

function toPaymentDto(
  row: PaymentRow,
  customerUserId: string | null,
): RequestPaymentItemDto {
  return {
    id: row.id,
    type: row.type,
    amountRubles: row.amountRubles,
    comment: row.comment,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    createdBySide: authorSide(row.createdByUserId, customerUserId),
  };
}

function toFinanceDto(
  totalAmountRubles: number | null,
  payments: PaymentRow[],
  customerUserId: string | null,
): RequestFinanceDto {
  const paidAmountRubles = sumPaidRublesByType(
    payments as unknown as PaymentAmountWithTypeAndPaidAt[],
    'CONTRACT',
  );
  return {
    totalAmountRubles,
    paidAmountRubles,
    remainingAmountRubles: remainingRubles(totalAmountRubles, paidAmountRubles),
    payments: payments.map((row) => toPaymentDto(row, customerUserId)),
  };
}

@Injectable()
export class RequestPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly chat?: ChatService,
  ) {}

  private async requireProviderId(actorUserId: string) {
    const ctx = await this.authService.getServiceManagementContext(
      actorUserId,
      'read',
    );
    if (ctx.isPlatformAdmin) throw new ForbiddenException('Forbidden');
    if (!ctx.providerId)
      throw new NotFoundException('Active provider is required');
    return ctx.providerId;
  }

  private async loadProviderRequest(input: {
    providerId: string;
    requestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        serviceId: true,
        categoryId: true,
        providerId: true,
        customerUserId: true,
        requestCityId: true,
        lockedAt: true,
        totalAmountRubles: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        providerOffers: { select: { providerId: true, status: true } },
        requestCity: { select: { regionCode: true } },
        customerUser: {
          select: { customerCity: { select: { regionCode: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    await this.assertProviderMayWrite(input.providerId, request);
    return request;
  }

  /**
   * Why: цену меняет выбранный исполнитель или тот, кто уже в заявке
   * (диалог или та же лента, что и карточка). Чужой провайдер получает 403.
   */
  private async assertProviderMayWrite(
    actorProviderId: string,
    request: {
      id: string;
      serviceId: string | null;
      categoryId: string | null;
      providerId: string | null;
      lockedAt: Date | null;
      requestCityId: string | null;
      providerOffers?: Array<{ providerId: string; status: string }>;
      requestCity?: { regionCode: string } | null;
      customerUser?: { customerCity: { regionCode: string } | null } | null;
    },
  ) {
    if (
      request.lockedAt &&
      request.providerId &&
      request.providerId !== actorProviderId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    if (request.providerId === actorProviderId) return;
    if (
      request.providerOffers?.some(
        (offer) =>
          offer.providerId === actorProviderId && offer.status === 'SELECTED',
      )
    ) {
      return;
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { requestId: request.id, providerId: actorProviderId },
      select: { id: true },
    });
    if (conversation) return;
    if (request.serviceId) throw new ForbiddenException('Forbidden');

    const allowed = await this.providerMatchesFeed(actorProviderId, request);
    if (!allowed) throw new ForbiddenException('Forbidden');
  }

  private async providerMatchesFeed(
    actorProviderId: string,
    request: {
      categoryId: string | null;
      requestCity?: { regionCode: string } | null;
      customerUser?: { customerCity: { regionCode: string } | null } | null;
    },
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: actorProviderId },
      select: { city: { select: { regionCode: true } } },
    });
    const providerRegion = provider?.city?.regionCode ?? null;
    const requestRegion =
      request.requestCity?.regionCode ??
      request.customerUser?.customerCity?.regionCode ??
      null;
    if (!providerRegion || !requestRegion || providerRegion !== requestRegion) {
      return false;
    }
    if (!request.categoryId) return true;
    const service = await this.prisma.service.findFirst({
      where: {
        providerId: actorProviderId,
        categoryId: request.categoryId,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });
    return Boolean(service);
  }

  private async noteTargets(input: {
    requestProviderId: string | null;
    actorProviderId: string | null;
    requestId: string;
  }): Promise<string[]> {
    const ids = new Set<string>();
    if (input.requestProviderId) ids.add(input.requestProviderId);
    if (input.actorProviderId) ids.add(input.actorProviderId);
    if (ids.size === 0) {
      const rows = await this.prisma.conversation.findMany({
        where: { requestId: input.requestId },
        select: { providerId: true },
      });
      for (const row of rows) ids.add(row.providerId);
    }
    return [...ids];
  }

  private async postNote(input: {
    requestId: string;
    actorUserId: string;
    customerUserId: string | null;
    requestProviderId: string | null;
    actorProviderId: string | null;
    body: string | null;
  }) {
    if (!input.body || !input.customerUserId || !this.chat) return;
    const providerIds = await this.noteTargets({
      requestId: input.requestId,
      requestProviderId: input.requestProviderId,
      actorProviderId: input.actorProviderId,
    });
    if (providerIds.length === 0) return;
    try {
      await this.chat.postFinanceNote({
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        customerUserId: input.customerUserId,
        providerIds,
        body: input.body,
      });
    } catch {
      // Цена уже сохранена. Чат не должен откатывать отметку.
    }
  }

  private assertWritable(status: string) {
    if (CLOSED_STATUSES.has(status)) {
      throw new ForbiddenException(
        'Finance cannot be changed after the request is closed',
      );
    }
  }

  async getForProvider(input: {
    actorUserId: string;
    requestId: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    return toFinanceDto(
      request.totalAmountRubles,
      request.payments,
      request.customerUserId,
    );
  }

  async getForCustomer(input: {
    actorUserId: string;
    requestId: string;
  }): Promise<RequestFinanceDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: {
        customerUserId: true,
        totalAmountRubles: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
      },
    });
    if (!request) {
      const exists = await this.prisma.request.findFirst({
        where: { id: input.requestId },
        select: { id: true },
      });
      if (exists) throw new ForbiddenException('Forbidden');
      throw new NotFoundException('Request not found');
    }
    return toFinanceDto(
      request.totalAmountRubles,
      request.payments,
      request.customerUserId,
    );
  }

  async setTotalForProvider(input: {
    actorUserId: string;
    requestId: string;
    totalAmountRubles: number;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertWritable(request.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.request.update({
        where: { id: request.id },
        data: { totalAmountRubles: input.totalAmountRubles },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'FINANCE_TOTAL_SET',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          payload: { totalAmountRubles: input.totalAmountRubles },
        },
      });
      return next;
    });

    const side = 'Исполнитель';
    const nextAmount = input.totalAmountRubles;
    const prev = request.totalAmountRubles;
    const body =
      prev === nextAmount
        ? null
        : prev == null
          ? `${side} указал цену ${formatRubles(nextAmount)}`
          : `${side} изменил цену: было ${formatRubles(prev)}, стало ${formatRubles(nextAmount)}`;
    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: request.providerId,
      actorProviderId: providerId,
      body,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
    );
  }

  async addPaymentForProvider(input: {
    actorUserId: string;
    requestId: string;
    amountRubles: number;
    comment: string;
    type?: RequestPaymentType;
    paidAt?: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertWritable(request.status);

    const comment = input.comment.trim();
    if (comment.length < 1)
      throw new BadRequestException('Comment is required');

    const type: RequestPaymentType = input.type ?? 'CONTRACT';
    const paidAt = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.requestPayment.create({
        data: {
          requestId: request.id,
          providerId,
          type,
          amountRubles: input.amountRubles,
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
          payload: { amountRubles: input.amountRubles, comment, type },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });

    const label = type === 'OTHER' ? 'расход' : 'оплату';
    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: request.providerId,
      actorProviderId: providerId,
      body: `Исполнитель добавил ${label} ${formatRubles(input.amountRubles)}: ${comment}`,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
    );
  }

  async markPaymentPaidForProvider(input: {
    actorUserId: string;
    requestId: string;
    paymentId: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertWritable(request.status);

    const payment = request.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt != null)
      throw new BadRequestException('Payment is already marked as paid');

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.requestPayment.updateMany({
        where: { id: input.paymentId, requestId: request.id, paidAt: null },
        data: { paidAt: now },
      });
      if (changed.count !== 1)
        throw new BadRequestException('Payment is already marked as paid');

      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'PAYMENT_MARKED_PAID',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          payload: {
            paymentId: payment.id,
            amountRubles: payment.amountRubles,
            comment: payment.comment,
            type: payment.type,
            paidAt: now.toISOString(),
          },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });

    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: request.providerId,
      actorProviderId: providerId,
      body: `Исполнитель отметил оплату ${formatRubles(payment.amountRubles)}: ${payment.comment}`,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
    );
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
        customerUserId: true,
        lockedAt: true,
        totalAmountRubles: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    this.assertWritable(request.status);

    const payment = request.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt != null)
      throw new BadRequestException('Payment is already marked as paid');

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.requestPayment.updateMany({
        where: { id: input.paymentId, requestId: request.id, paidAt: null },
        data: { paidAt: now },
      });
      if (changed.count !== 1)
        throw new BadRequestException('Payment is already marked as paid');

      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'PAYMENT_MARKED_PAID',
          actorUserId: input.actorUserId,
          actorProviderId: request.providerId!,
          payload: {
            paymentId: payment.id,
            amountRubles: payment.amountRubles,
            comment: payment.comment,
            type: payment.type,
            paidAt: now.toISOString(),
          },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });

    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: request.providerId,
      actorProviderId: null,
      body: `Клиент отметил оплату ${formatRubles(payment.amountRubles)}: ${payment.comment}`,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
    );
  }

  async setTotalForCustomer(input: {
    actorUserId: string;
    requestId: string;
    totalAmountRubles: number;
  }): Promise<RequestFinanceDto> {
    const request = await this.loadCustomerRequest(input);
    this.assertWritable(request.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.request.update({
        where: { id: request.id },
        data: { totalAmountRubles: input.totalAmountRubles },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'FINANCE_TOTAL_SET',
          actorUserId: input.actorUserId,
          actorProviderId: request.providerId,
          payload: { totalAmountRubles: input.totalAmountRubles },
        },
      });
      return next;
    });
    const prev = request.totalAmountRubles;
    const nextAmount = input.totalAmountRubles;
    const body =
      prev === nextAmount
        ? null
        : prev == null
          ? `Клиент указал цену ${formatRubles(nextAmount)}`
          : `Клиент изменил цену: было ${formatRubles(prev)}, стало ${formatRubles(nextAmount)}`;
    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: request.providerId,
      actorProviderId: null,
      body,
    });
    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
    );
  }

  async addPaymentForCustomer(input: {
    actorUserId: string;
    requestId: string;
    amountRubles: number;
    comment: string;
    type?: RequestPaymentType;
  }): Promise<RequestFinanceDto> {
    const request = await this.loadCustomerRequest(input);
    this.assertWritable(request.status);
    const comment = input.comment.trim();
    if (comment.length < 1)
      throw new BadRequestException('Comment is required');
    const providerId = await this.resolvePaymentProviderId(request);
    const type: RequestPaymentType = input.type ?? 'OTHER';
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.requestPayment.create({
        data: {
          requestId: request.id,
          providerId,
          type,
          amountRubles: input.amountRubles,
          comment,
          paidAt: null,
          createdByUserId: input.actorUserId,
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          type: 'PAYMENT_ADDED',
          actorUserId: input.actorUserId,
          actorProviderId: providerId,
          payload: { amountRubles: input.amountRubles, comment, type },
        },
      });
      return tx.request.findFirstOrThrow({
        where: { id: request.id },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
    });
    const label = type === 'OTHER' ? 'расход' : 'оплату';
    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: providerId,
      actorProviderId: null,
      body: `Клиент добавил ${label} ${formatRubles(input.amountRubles)}: ${comment}`,
    });
    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
    );
  }

  private async loadCustomerRequest(input: {
    actorUserId: string;
    requestId: string;
  }) {
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        providerId: true,
        customerUserId: true,
        totalAmountRubles: true,
        payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.customerUserId !== input.actorUserId) {
      throw new ForbiddenException('Forbidden');
    }
    return request;
  }

  private async resolvePaymentProviderId(request: {
    id: string;
    providerId: string | null;
  }) {
    if (request.providerId) return request.providerId;
    const conversation = await this.prisma.conversation.findFirst({
      where: { requestId: request.id },
      select: { providerId: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!conversation) {
      throw new BadRequestException(
        'Расход можно добавить, когда в заявке есть исполнитель',
      );
    }
    return conversation.providerId;
  }
}

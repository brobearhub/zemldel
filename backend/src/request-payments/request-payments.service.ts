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

const PAYMENT_BLOCKED_STATUSES = new Set(['CANCELLED', 'CLOSED']);
const PRICE_MUTABLE_STATUSES = new Set(['NEW', 'DISCUSSING', 'TERMS_AGREED']);

function isPriceMutable(request: {
  status: string;
  contractAcceptedAt: Date | null;
}): boolean {
  return (
    request.contractAcceptedAt == null &&
    PRICE_MUTABLE_STATUSES.has(request.status)
  );
}

const paymentSelect = {
  id: true,
  type: true,
  amountRubles: true,
  comment: true,
  paidAt: true,
  createdAt: true,
  createdByUserId: true,
} as const;

const priceProposalSelect = {
  id: true,
  providerId: true,
  amountRubles: true,
  authorSide: true,
  proposedByUserId: true,
  acceptedAt: true,
  acceptedByUserId: true,
  supersededAt: true,
  createdAt: true,
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

type PriceProposalRow = {
  id: string;
  providerId: string;
  amountRubles: number;
  authorSide: 'CUSTOMER' | 'PROVIDER';
  proposedByUserId: string | null;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  supersededAt: Date | null;
  createdAt: Date;
};

type PriceRequestState = {
  id: string;
  status: string;
  contractAcceptedAt: Date | null;
  providerId: string | null;
  lockedAt: Date | null;
  customerUserId: string | null;
  totalAmountRubles: number | null;
  payments: PaymentRow[];
  priceProposals: PriceProposalRow[];
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
  priceProposal: PriceProposalRow | null,
  viewerSide: 'CUSTOMER' | 'PROVIDER',
  priceMutable: boolean,
  canProposePrice = priceMutable,
): RequestFinanceDto {
  const paidAmountRubles = sumPaidRublesByType(
    payments satisfies PaymentAmountWithTypeAndPaidAt[],
    'CONTRACT',
  );
  return {
    totalAmountRubles,
    priceProposal: priceProposal
      ? {
          id: priceProposal.id,
          providerId: priceProposal.providerId,
          amountRubles: priceProposal.amountRubles,
          authorSide: priceProposal.authorSide,
          acceptedAt: priceProposal.acceptedAt?.toISOString() ?? null,
          createdAt: priceProposal.createdAt.toISOString(),
        }
      : null,
    canProposePrice,
    canAcceptPrice:
      priceMutable &&
      priceProposal != null &&
      priceProposal.acceptedAt == null &&
      priceProposal.authorSide !== viewerSide,
    paidAmountRubles,
    remainingAmountRubles: remainingRubles(totalAmountRubles, paidAmountRubles),
    payments: payments.map((row) => toPaymentDto(row, customerUserId)),
  };
}

function scopedTotalAmount(
  requestProviderId: string | null,
  providerId: string,
  storedTotal: number | null,
  proposal: PriceProposalRow | null,
): number | null {
  if (proposal?.acceptedAt) return proposal.amountRubles;
  return requestProviderId === providerId ? storedTotal : null;
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
        contractAcceptedAt: true,
        totalAmountRubles: true,
        payments: {
          where: { providerId: input.providerId },
          select: paymentSelect,
          orderBy: { paidAt: 'asc' },
        },
        priceProposals: {
          where: { providerId: input.providerId, supersededAt: null },
          select: priceProposalSelect,
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
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

  private assertPaymentMutable(status: string) {
    if (PAYMENT_BLOCKED_STATUSES.has(status)) {
      throw new ForbiddenException(
        'Finance cannot be changed after the request is closed',
      );
    }
  }

  private assertPriceMutable(request: {
    status: string;
    contractAcceptedAt: Date | null;
  }) {
    if (!isPriceMutable(request)) {
      throw new ForbiddenException(
        'Price cannot be changed after contract acceptance',
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
      scopedTotalAmount(
        request.providerId,
        providerId,
        request.totalAmountRubles,
        request.priceProposals?.[0] ?? null,
      ),
      request.payments,
      request.customerUserId,
      request.priceProposals?.[0] ?? null,
      'PROVIDER',
      isPriceMutable(request),
    );
  }

  async getForCustomer(input: {
    actorUserId: string;
    requestId: string;
    conversationId?: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.resolveCustomerFinanceProviderId(input);
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: {
        status: true,
        contractAcceptedAt: true,
        providerId: true,
        customerUserId: true,
        totalAmountRubles: true,
        payments: {
          where: { providerId },
          select: paymentSelect,
          orderBy: { paidAt: 'asc' },
        },
        priceProposals: {
          where: { providerId, supersededAt: null },
          select: priceProposalSelect,
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
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
      scopedTotalAmount(
        request.providerId,
        providerId,
        request.totalAmountRubles,
        request.priceProposals?.[0] ?? null,
      ),
      request.payments,
      request.customerUserId,
      request.priceProposals?.[0] ?? null,
      'CUSTOMER',
      isPriceMutable(request),
      request.providerId != null || request.priceProposals.length > 0,
    );
  }

  async proposePriceForProvider(input: {
    actorUserId: string;
    requestId: string;
    amountRubles: number;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertPriceMutable(request);
    return this.createPriceProposal({
      request,
      providerId,
      actorUserId: input.actorUserId,
      authorSide: 'PROVIDER',
      amountRubles: input.amountRubles,
    });
  }

  async acceptPriceForProvider(input: {
    actorUserId: string;
    requestId: string;
    proposalId: string;
  }): Promise<RequestFinanceDto> {
    const providerId = await this.requireProviderId(input.actorUserId);
    const request = await this.loadProviderRequest({
      providerId,
      requestId: input.requestId,
    });
    this.assertPriceMutable(request);
    return this.acceptPriceProposal({
      request,
      providerId,
      actorUserId: input.actorUserId,
      actorSide: 'PROVIDER',
      proposalId: input.proposalId,
    });
  }

  private async createPriceProposal(input: {
    request: PriceRequestState;
    providerId: string;
    actorUserId: string;
    authorSide: 'CUSTOMER' | 'PROVIDER';
    amountRubles: number;
  }): Promise<RequestFinanceDto> {
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.request.updateMany({
        where: {
          id: input.request.id,
          providerId: input.request.providerId,
          lockedAt: input.request.lockedAt,
          contractAcceptedAt: null,
          status: { in: ['NEW', 'DISCUSSING', 'TERMS_AGREED'] },
        },
        data: { updatedAt: now },
      });
      if (lock.count !== 1) {
        throw new ForbiddenException(
          'Price cannot be changed after contract acceptance',
        );
      }
      await tx.requestPriceProposal.updateMany({
        where: {
          requestId: input.request.id,
          providerId: input.providerId,
          supersededAt: null,
        },
        data: { supersededAt: now },
      });
      const proposal = await tx.requestPriceProposal.create({
        data: {
          requestId: input.request.id,
          providerId: input.providerId,
          amountRubles: input.amountRubles,
          authorSide: input.authorSide,
          proposedByUserId: input.actorUserId,
        },
        select: priceProposalSelect,
      });
      const request = await tx.request.update({
        where: { id: input.request.id },
        data: { totalAmountRubles: null },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: input.request.id,
          type: 'PRICE_PROPOSED',
          actorUserId: input.actorUserId,
          actorProviderId: input.providerId,
          payload: {
            proposalId: proposal.id,
            amountRubles: input.amountRubles,
            authorSide: input.authorSide,
          },
        },
      });
      return { ...request, proposal };
    });

    await this.postNote({
      requestId: input.request.id,
      actorUserId: input.actorUserId,
      customerUserId: input.request.customerUserId,
      requestProviderId: input.providerId,
      actorProviderId:
        input.authorSide === 'PROVIDER' ? input.providerId : null,
      body: `${input.authorSide === 'PROVIDER' ? 'Исполнитель' : 'Клиент'} предложил цену ${formatRubles(input.amountRubles)}`,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      input.request.customerUserId,
      updated.proposal,
      input.authorSide,
      true,
    );
  }

  private async acceptPriceProposal(input: {
    request: PriceRequestState;
    providerId: string;
    actorUserId: string;
    actorSide: 'CUSTOMER' | 'PROVIDER';
    proposalId: string;
  }): Promise<RequestFinanceDto> {
    const proposal = input.request.priceProposals.find(
      (item) => item.id === input.proposalId,
    );
    if (
      !proposal ||
      proposal.providerId !== input.providerId ||
      proposal.supersededAt ||
      proposal.acceptedAt
    ) {
      throw new ForbiddenException('Price proposal is not active');
    }
    if (proposal.authorSide === input.actorSide) {
      throw new ForbiddenException(
        'Own-side price proposal cannot be accepted',
      );
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.request.updateMany({
        where: {
          id: input.request.id,
          providerId: input.request.providerId,
          lockedAt: input.request.lockedAt,
          contractAcceptedAt: null,
          status: { in: ['NEW', 'DISCUSSING', 'TERMS_AGREED'] },
        },
        data: { updatedAt: now },
      });
      if (lock.count !== 1) {
        throw new ForbiddenException(
          'Price cannot be changed after contract acceptance',
        );
      }
      const accepted = await tx.requestPriceProposal.updateMany({
        where: {
          id: proposal.id,
          requestId: input.request.id,
          providerId: input.providerId,
          acceptedAt: null,
          supersededAt: null,
        },
        data: { acceptedAt: now, acceptedByUserId: input.actorUserId },
      });
      if (accepted.count !== 1) {
        throw new ForbiddenException('Price proposal is not active');
      }
      const request = await tx.request.update({
        where: { id: input.request.id },
        data: { totalAmountRubles: proposal.amountRubles },
        select: {
          totalAmountRubles: true,
          payments: { select: paymentSelect, orderBy: { paidAt: 'asc' } },
        },
      });
      await tx.requestEvent.create({
        data: {
          requestId: input.request.id,
          type: 'PRICE_ACCEPTED',
          actorUserId: input.actorUserId,
          actorProviderId: input.providerId,
          payload: {
            proposalId: proposal.id,
            amountRubles: proposal.amountRubles,
          },
        },
      });
      return {
        ...request,
        proposal: {
          ...proposal,
          acceptedAt: now,
          acceptedByUserId: input.actorUserId,
        },
      };
    });

    await this.postNote({
      requestId: input.request.id,
      actorUserId: input.actorUserId,
      customerUserId: input.request.customerUserId,
      requestProviderId: input.providerId,
      actorProviderId: input.actorSide === 'PROVIDER' ? input.providerId : null,
      body: `${input.actorSide === 'PROVIDER' ? 'Исполнитель' : 'Клиент'} принял цену ${formatRubles(proposal.amountRubles)}`,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      input.request.customerUserId,
      updated.proposal,
      input.actorSide,
      true,
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
    this.assertPaymentMutable(request.status);

    const comment = input.comment.trim();
    if (comment.length < 1)
      throw new BadRequestException('Comment is required');

    const type: RequestPaymentType = input.type ?? 'CONTRACT';
    const paidAt = null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.request.updateMany({
        where: {
          id: request.id,
          providerId: request.providerId,
          lockedAt: request.lockedAt,
          status: request.status,
        },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) {
        throw new ForbiddenException('Request provider scope has changed');
      }
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
          payments: {
            where: { providerId },
            select: paymentSelect,
            orderBy: { paidAt: 'asc' },
          },
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
      request.priceProposals?.[0] ?? null,
      'PROVIDER',
      isPriceMutable(request),
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
    this.assertPaymentMutable(request.status);

    const payment = request.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt != null)
      throw new BadRequestException('Payment is already marked as paid');

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.request.updateMany({
        where: {
          id: request.id,
          providerId: request.providerId,
          lockedAt: request.lockedAt,
          status: request.status,
        },
        data: { updatedAt: now },
      });
      if (lock.count !== 1) {
        throw new ForbiddenException('Request provider scope has changed');
      }
      const changed = await tx.requestPayment.updateMany({
        where: {
          id: input.paymentId,
          requestId: request.id,
          providerId,
          paidAt: null,
        },
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
          payments: {
            where: { providerId },
            select: paymentSelect,
            orderBy: { paidAt: 'asc' },
          },
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
      request.priceProposals?.[0] ?? null,
      'PROVIDER',
      isPriceMutable(request),
    );
  }

  async markPaymentPaidForCustomer(input: {
    actorUserId: string;
    requestId: string;
    paymentId: string;
    conversationId?: string;
  }): Promise<RequestFinanceDto> {
    const request = await this.loadCustomerRequest(input);
    this.assertPaymentMutable(request.status);
    const providerId = await this.resolvePaymentProviderId(request, input);

    const payment = request.payments.find((p) => p.id === input.paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paidAt != null)
      throw new BadRequestException('Payment is already marked as paid');

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.request.updateMany({
        where: {
          id: request.id,
          providerId: request.providerId,
          lockedAt: request.lockedAt,
          status: request.status,
        },
        data: { updatedAt: now },
      });
      if (lock.count !== 1) {
        throw new ForbiddenException('Request provider scope has changed');
      }
      const changed = await tx.requestPayment.updateMany({
        where: {
          id: input.paymentId,
          requestId: request.id,
          providerId,
          paidAt: null,
        },
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
          payments: {
            where: { providerId },
            select: paymentSelect,
            orderBy: { paidAt: 'asc' },
          },
        },
      });
    });

    await this.postNote({
      requestId: request.id,
      actorUserId: input.actorUserId,
      customerUserId: request.customerUserId,
      requestProviderId: providerId,
      actorProviderId: null,
      body: `Клиент отметил оплату ${formatRubles(payment.amountRubles)}: ${payment.comment}`,
    });

    return toFinanceDto(
      updated.totalAmountRubles,
      updated.payments,
      request.customerUserId,
      request.priceProposals?.[0] ?? null,
      'CUSTOMER',
      isPriceMutable(request),
    );
  }

  async proposePriceForCustomer(input: {
    actorUserId: string;
    requestId: string;
    amountRubles: number;
    conversationId?: string;
  }): Promise<RequestFinanceDto> {
    const request = await this.loadCustomerRequest(input);
    this.assertPriceMutable(request);
    const providerId = await this.resolvePaymentProviderId(request, input);
    if (!providerId) {
      throw new BadRequestException(
        'Provider must be selected before customer price proposal',
      );
    }
    return this.createPriceProposal({
      request,
      providerId,
      actorUserId: input.actorUserId,
      authorSide: 'CUSTOMER',
      amountRubles: input.amountRubles,
    });
  }

  async acceptPriceForCustomer(input: {
    actorUserId: string;
    requestId: string;
    proposalId: string;
    conversationId?: string;
  }): Promise<RequestFinanceDto> {
    const request = await this.loadCustomerRequest(input);
    this.assertPriceMutable(request);
    const proposal = request.priceProposals.find(
      (item) => item.id === input.proposalId,
    );
    if (!proposal) {
      throw new ForbiddenException('Price proposal is not active');
    }
    return this.acceptPriceProposal({
      request,
      providerId: proposal.providerId,
      actorUserId: input.actorUserId,
      actorSide: 'CUSTOMER',
      proposalId: input.proposalId,
    });
  }

  async addPaymentForCustomer(input: {
    actorUserId: string;
    requestId: string;
    amountRubles: number;
    comment: string;
    type?: RequestPaymentType;
    conversationId?: string;
  }): Promise<RequestFinanceDto> {
    const request = await this.loadCustomerRequest(input);
    this.assertPaymentMutable(request.status);
    const comment = input.comment.trim();
    if (comment.length < 1)
      throw new BadRequestException('Comment is required');
    const providerId = await this.resolvePaymentProviderId(request, input);
    const type: RequestPaymentType = input.type ?? 'OTHER';
    const updated = await this.prisma.$transaction(async (tx) => {
      const lock = await tx.request.updateMany({
        where: {
          id: request.id,
          providerId: request.providerId,
          lockedAt: request.lockedAt,
          status: request.status,
        },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) {
        throw new ForbiddenException('Request provider scope has changed');
      }
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
          payments: {
            where: { providerId },
            select: paymentSelect,
            orderBy: { paidAt: 'asc' },
          },
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
      request.priceProposals?.[0] ?? null,
      'CUSTOMER',
      isPriceMutable(request),
    );
  }

  private async loadCustomerRequest(input: {
    actorUserId: string;
    requestId: string;
    conversationId?: string;
  }) {
    const providerId = await this.resolveCustomerFinanceProviderId(input);
    const request = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: {
        id: true,
        status: true,
        contractAcceptedAt: true,
        providerId: true,
        lockedAt: true,
        customerUserId: true,
        totalAmountRubles: true,
        payments: {
          where: { providerId },
          select: paymentSelect,
          orderBy: { paidAt: 'asc' },
        },
        priceProposals: {
          where: { providerId, supersededAt: null },
          select: priceProposalSelect,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.customerUserId !== input.actorUserId) {
      throw new ForbiddenException('Forbidden');
    }
    return request;
  }

  private async resolvePaymentProviderId(
    request: {
      id: string;
      providerId: string | null;
    },
    input?: { actorUserId: string; requestId: string; conversationId?: string },
  ) {
    if (request.providerId) return request.providerId;
    if (!input) {
      throw new BadRequestException('Conversation is required before lock');
    }
    return this.resolveCustomerFinanceProviderId(input);
  }

  private async resolveCustomerFinanceProviderId(input: {
    actorUserId: string;
    requestId: string;
    conversationId?: string;
  }): Promise<string> {
    const owner = await this.prisma.request.findFirst({
      where: { id: input.requestId, customerUserId: input.actorUserId },
      select: { providerId: true, lockedAt: true, customerUserId: true },
    });
    if (!owner || owner.customerUserId !== input.actorUserId) {
      const exists = await this.prisma.request.findFirst({
        where: { id: input.requestId },
        select: { id: true },
      });
      if (exists) throw new ForbiddenException('Forbidden');
      throw new NotFoundException('Request not found');
    }
    if (owner.providerId) return owner.providerId;
    if (!input.conversationId) {
      throw new BadRequestException('Conversation is required before lock');
    }
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        requestId: input.requestId,
        customerUserId: input.actorUserId,
      },
      select: { providerId: true },
    });
    if (!conversation) {
      throw new ForbiddenException('Conversation does not belong to request');
    }
    return conversation.providerId;
  }
}

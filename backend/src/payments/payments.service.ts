import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import type { PaymentProvider } from './providers/payment-provider.interface';
import { paymentToDtoPlain, type PaymentDto } from './dto/payment.dto';
import type { PaymentOutcome } from './types';

type DealTermsSnapshot = {
  amountMinor?: unknown;
  currency?: unknown;
  price?: unknown;
  amount?: unknown;
  amountRub?: unknown;
  total?: unknown;
  priceRub?: unknown;
  priceMinor?: unknown;
};

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0)
      return null;
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }
  return null;
}

function parseRublesToMinor(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value * 100);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100);
  }
  return null;
}

function extractAmount(dealTerms: unknown): {
  amountMinor: number;
  currency: string;
} {
  if (!dealTerms || typeof dealTerms !== 'object') {
    throw new BadRequestException('Deal terms are missing');
  }
  const snapshot = dealTerms as DealTermsSnapshot;
  const currencyRaw = snapshot.currency;
  const currency =
    typeof currencyRaw === 'string' && currencyRaw.trim().length > 0
      ? currencyRaw.trim().toUpperCase()
      : 'RUB';

  const minorCandidates = [snapshot.amountMinor, snapshot.priceMinor];
  for (const candidate of minorCandidates) {
    const amountMinor = parsePositiveInt(candidate);
    if (amountMinor) return { amountMinor, currency };
  }

  // Fallback: parse "rubles" fields (string/number; stored in rubles, convert to minor units)
  const rubleCandidates = [
    snapshot.price,
    snapshot.priceRub,
    snapshot.amount,
    snapshot.amountRub,
    snapshot.total,
  ];
  for (const candidate of rubleCandidates) {
    const amountMinor = parseRublesToMinor(candidate);
    if (amountMinor) return { amountMinor, currency };
  }

  throw new BadRequestException(
    'Deal terms are missing a valid amount (amountMinor|priceMinor or parseable price/amount in rubles)',
  );
}

function toPaymentDto(
  row: {
    id: string;
    requestId: string;
    type: 'PAYMENT' | 'PAYOUT';
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    providerKey: string;
    amountMinor: number;
    currency: string;
    externalId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  redirectUrl: string | null,
): PaymentDto {
  return paymentToDtoPlain({
    id: row.id,
    serviceRequestId: row.requestId,
    type: row.type,
    status: row.status,
    providerKey: row.providerKey,
    amountMinor: row.amountMinor,
    currency: row.currency,
    redirectUrl,
    externalId: row.externalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function redirectFromPayload(payload: Prisma.JsonValue | null): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const value = (payload as Record<string, unknown>).redirectUrl;
  return typeof value === 'string' ? value : null;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistry,
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
    await tx.requestEvent.create({
      data: {
        requestId: input.serviceRequestId,
        type: input.type,
        actorUserId: input.actorUserId ?? null,
        actorProviderId: input.actorProviderId ?? null,
        payload: input.payload ?? undefined,
      },
      select: { id: true },
    });
  }

  async getPaymentByIdForUser(
    actorUserId: string,
    id: string,
  ): Promise<PaymentDto> {
    const row = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        request: {
          select: { customerUserId: true, providerId: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Payment not found');

    const isCustomer = row.request.customerUserId === actorUserId;
    if (!isCustomer) {
      throw new ForbiddenException('Forbidden');
    }

    return toPaymentDto(row, redirectFromPayload(row.payload));
  }

  async initiateCustomerPayment(
    actorUserId: string,
    serviceRequestId: string,
  ): Promise<PaymentDto> {
    const provider = this.registry.getDefault();

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: serviceRequestId },
        select: {
          id: true,
          status: true,
          customerUserId: true,
          dealTerms: true,
        },
      });
      if (!request) throw new NotFoundException('Request not found');
      if (request.customerUserId !== actorUserId) {
        throw new ForbiddenException('Forbidden');
      }
      if (
        request.status !== 'CONTRACT_ACCEPTED' &&
        request.status !== 'PAYMENT_PENDING'
      ) {
        throw new BadRequestException(
          'Payment is not available for this status',
        );
      }

      const existingPending = await tx.payment.findFirst({
        where: {
          requestId: serviceRequestId,
          type: 'PAYMENT',
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existingPending) {
        return toPaymentDto(
          existingPending,
          redirectFromPayload(existingPending.payload),
        );
      }

      const existingSucceeded = await tx.payment.findFirst({
        where: {
          requestId: serviceRequestId,
          type: 'PAYMENT',
          status: 'SUCCEEDED',
        },
      });
      if (existingSucceeded) {
        throw new ConflictException('Payment is already completed');
      }

      const { amountMinor, currency } = extractAmount(request.dealTerms);

      const payment = await tx.payment.create({
        data: {
          requestId: serviceRequestId,
          type: 'PAYMENT',
          status: 'PENDING',
          providerKey: provider.key,
          amountMinor,
          currency,
          initiatedByUserId: actorUserId,
        },
      });

      if (request.status === 'CONTRACT_ACCEPTED') {
        await tx.request.update({
          where: { id: request.id },
          data: { status: 'PAYMENT_PENDING' },
          select: { id: true },
        });
      }

      await this.addEvent(tx, {
        serviceRequestId: request.id,
        type: 'PAYMENT_INITIATED',
        actorUserId,
        payload: {
          paymentId: payment.id,
          providerKey: provider.key,
          amountMinor,
          currency,
        },
      });

      const initiateResult = await provider.initiate({
        paymentId: payment.id,
        type: 'PAYMENT',
        amountMinor,
        currency,
        serviceRequestId: request.id,
        returnUrl: '',
      });

      const payloadJson = {
        ...(initiateResult.payload ?? {}),
        redirectUrl: initiateResult.redirectUrl ?? null,
      } satisfies Prisma.InputJsonValue;

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          externalId: initiateResult.externalId,
          payload: payloadJson,
        },
      });

      if (initiateResult.autoOutcome) {
        throw new InternalServerErrorException(
          'autoOutcome is not supported for customer payments',
        );
      }

      return toPaymentDto(updated, initiateResult.redirectUrl ?? null);
    });
  }

  async initiateProviderPayout(
    actorProviderId: string,
    serviceRequestId: string,
  ): Promise<PaymentDto> {
    const provider = this.registry.getDefault();

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findFirst({
        where: { id: serviceRequestId, providerId: actorProviderId },
        select: {
          id: true,
          status: true,
          providerId: true,
          dealTerms: true,
        },
      });
      if (!request) throw new NotFoundException('Order not found');
      if (request.status !== 'ACCEPTED') {
        throw new ForbiddenException('Order must be accepted before payout');
      }

      const existingPayout = await tx.payment.findFirst({
        where: {
          requestId: serviceRequestId,
          type: 'PAYOUT',
          status: { in: ['PENDING', 'SUCCEEDED'] },
        },
      });
      if (existingPayout && existingPayout.status === 'SUCCEEDED') {
        throw new ConflictException('Payout already completed');
      }

      const { amountMinor, currency } = extractAmount(request.dealTerms);

      const payout =
        existingPayout ??
        (await tx.payment.create({
          data: {
            requestId: serviceRequestId,
            type: 'PAYOUT',
            status: 'PENDING',
            providerKey: provider.key,
            amountMinor,
            currency,
            initiatedByProviderId: actorProviderId,
          },
        }));

      const initiateResult = await provider.initiate({
        paymentId: payout.id,
        type: 'PAYOUT',
        amountMinor,
        currency,
        serviceRequestId: request.id,
        returnUrl: '',
      });

      const payloadJson = {
        ...(initiateResult.payload ?? {}),
        redirectUrl: initiateResult.redirectUrl ?? null,
      } satisfies Prisma.InputJsonValue;

      const withExternal = await tx.payment.update({
        where: { id: payout.id },
        data: {
          externalId: initiateResult.externalId,
          payload: payloadJson,
        },
      });

      if (!initiateResult.autoOutcome) {
        return toPaymentDto(withExternal, initiateResult.redirectUrl ?? null);
      }

      return this.applyOutcomeInTx(
        tx,
        withExternal.id,
        initiateResult.autoOutcome,
        actorProviderId,
      );
    });
  }

  async handleWebhook(
    providerKey: string,
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<{ ok: true }> {
    const provider = this.registry.resolve(providerKey);
    const parsed = await provider.parseWebhook(headers, body);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { providerKey: provider.key, externalId: parsed.externalId },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }
      await this.applyOutcomeInTx(tx, payment.id, parsed.outcome, null);
    });

    return { ok: true };
  }

  private async applyOutcomeInTx(
    tx: Prisma.TransactionClient,
    paymentId: string,
    outcome: PaymentOutcome,
    actorProviderId: string | null,
  ): Promise<PaymentDto> {
    const current = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });

    if (current.status !== 'PENDING') {
      return toPaymentDto(current, redirectFromPayload(current.payload));
    }

    const now = new Date();

    if (outcome === 'SUCCEEDED') {
      const updated = await tx.payment.update({
        where: { id: current.id },
        data: { status: 'SUCCEEDED', confirmedAt: now },
      });

      if (current.type === 'PAYMENT') {
        await tx.request.update({
          where: { id: current.requestId },
          data: { status: 'PAYMENT_PROCESSING' },
          select: { id: true },
        });
        await this.addEvent(tx, {
          serviceRequestId: current.requestId,
          type: 'ESCROW_RESERVED',
          payload: { paymentId: current.id },
        });
      } else {
        await tx.request.update({
          where: { id: current.requestId },
          data: { status: 'PAID' },
          select: { id: true },
        });
        await this.addEvent(tx, {
          serviceRequestId: current.requestId,
          type: 'PAYOUT',
          actorProviderId,
          payload: { paymentId: current.id },
        });
      }

      return toPaymentDto(updated, redirectFromPayload(updated.payload));
    }

    const updated = await tx.payment.update({
      where: { id: current.id },
      data: { status: outcome, failedAt: now },
    });

    if (current.type === 'PAYMENT') {
      await tx.request.update({
        where: { id: current.requestId },
        data: { status: 'PAYMENT_PENDING' },
        select: { id: true },
      });
      await this.addEvent(tx, {
        serviceRequestId: current.requestId,
        type: 'PAYMENT_FAILED',
        payload: { paymentId: current.id, outcome },
      });
    } else {
      await this.addEvent(tx, {
        serviceRequestId: current.requestId,
        type: 'PAYOUT_FAILED',
        actorProviderId,
        payload: { paymentId: current.id, outcome },
      });
    }

    return toPaymentDto(updated, redirectFromPayload(updated.payload));
  }
}

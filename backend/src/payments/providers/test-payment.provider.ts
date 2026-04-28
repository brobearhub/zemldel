import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';
import type {
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentOutcome,
  PaymentWebhookResult,
} from '../types';

const OUTCOMES = ['SUCCEEDED', 'FAILED', 'CANCELLED'] as const;

function isOutcome(value: unknown): value is PaymentOutcome {
  return (
    typeof value === 'string' && (OUTCOMES as readonly string[]).includes(value)
  );
}

function getFrontendUrl() {
  const raw = process.env.FRONTEND_URL?.trim();
  if (!raw) return 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

function getWebhookSecret() {
  const secret = process.env.TEST_PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    throw new InternalServerErrorException(
      'TEST_PAYMENT_WEBHOOK_SECRET is not configured',
    );
  }
  return secret;
}

@Injectable()
export class TestPaymentProvider extends PaymentProvider {
  readonly key = 'test';

  async initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const externalId = randomUUID();

    if (input.type === 'PAYOUT') {
      return {
        externalId,
        redirectUrl: null,
        autoOutcome: 'SUCCEEDED',
        payload: { simulated: true, type: 'PAYOUT' },
      };
    }

    const redirectUrl = `${getFrontendUrl()}/payments/mock/${input.paymentId}`;
    return {
      externalId,
      redirectUrl,
      payload: { simulated: true, type: 'PAYMENT' },
    };
  }

  async parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<PaymentWebhookResult> {
    const header = headers['x-test-webhook-secret'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided) {
      throw new UnauthorizedException('Missing webhook secret');
    }

    const expected = getWebhookSecret();
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid webhook body');
    }
    const record = body as Record<string, unknown>;
    const externalId = record.externalId;
    const outcome = record.outcome;
    if (typeof externalId !== 'string' || externalId.length === 0) {
      throw new BadRequestException('externalId is required');
    }
    if (!isOutcome(outcome)) {
      throw new BadRequestException(
        'outcome must be SUCCEEDED/FAILED/CANCELLED',
      );
    }

    return { externalId, outcome };
  }
}

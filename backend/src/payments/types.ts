import type { PaymentType } from '@prisma/client';

export type PaymentOutcome = 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type PaymentInitiateInput = {
  paymentId: string;
  type: PaymentType;
  amountMinor: number;
  currency: string;
  serviceRequestId: string;
  returnUrl: string;
};

export type PaymentInitiateResult = {
  externalId: string;
  redirectUrl: string | null;
  autoOutcome?: PaymentOutcome;
  payload?: Record<string, unknown>;
};

export type PaymentWebhookResult = {
  externalId: string;
  outcome: PaymentOutcome;
  payload?: Record<string, unknown>;
};

export const PAYMENT_PROVIDERS_TOKEN = 'PAYMENT_PROVIDERS';

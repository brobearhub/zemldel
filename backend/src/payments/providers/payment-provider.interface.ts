import type {
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentWebhookResult,
} from '../types';

export abstract class PaymentProvider {
  abstract readonly key: string;

  abstract initiate(
    input: PaymentInitiateInput,
  ): Promise<PaymentInitiateResult>;

  abstract parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<PaymentWebhookResult>;
}

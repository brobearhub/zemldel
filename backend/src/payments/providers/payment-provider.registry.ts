import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';
import { PAYMENT_PROVIDERS_TOKEN } from '../types';

@Injectable()
export class PaymentProviderRegistry {
  private readonly byKey: Map<string, PaymentProvider>;

  constructor(@Inject(PAYMENT_PROVIDERS_TOKEN) providers: PaymentProvider[]) {
    this.byKey = new Map();
    for (const provider of providers) {
      if (this.byKey.has(provider.key)) {
        throw new InternalServerErrorException(
          `Duplicate payment provider key: ${provider.key}`,
        );
      }
      this.byKey.set(provider.key, provider);
    }
  }

  resolve(key: string): PaymentProvider {
    const provider = this.byKey.get(key);
    if (!provider) {
      throw new NotFoundException(`Payment provider not found: ${key}`);
    }
    return provider;
  }

  getDefault(): PaymentProvider {
    const key = process.env.PAYMENTS_DEFAULT_PROVIDER?.trim() || 'test';
    return this.resolve(key);
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TestPaymentProvider } from './providers/test-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { PAYMENT_PROVIDERS_TOKEN } from './types';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    TestPaymentProvider,
    {
      provide: PAYMENT_PROVIDERS_TOKEN,
      useFactory: (test: TestPaymentProvider) => [test],
      inject: [TestPaymentProvider],
    },
    PaymentProviderRegistry,
  ],
})
export class PaymentsModule {}

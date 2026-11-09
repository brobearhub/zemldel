import { BadRequestException } from '@nestjs/common';

export function receiptEmail(value: string | null | undefined): string {
  const email = value?.trim();
  if (!email || email.length > 64 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BadRequestException(
      'Для отправки чека нужен корректный email покупателя длиной до 64 символов. Проверьте email в настройках аккаунта.',
    );
  return email;
}

// Seller's confirmed fiscal settings: FFD 1.05, simplified income minus expenses,
// no VAT. FfdVersion is omitted for the ReceiptFfd105 API schema.
export function billingReceipt(
  email: string | null,
  title: string,
  amount: number,
) {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new BadRequestException('Некорректная сумма чека');
  return {
    Email: receiptEmail(email),
    Taxation: 'usn_income_outcome',
    Items: [
      {
        Name: title,
        Price: amount,
        Quantity: 1,
        Amount: amount,
        PaymentMethod: 'full_payment',
        PaymentObject: 'service',
        Tax: 'none',
      },
    ],
  };
}

export type PaymentAmount = {
  readonly amountRubles: number;
};

export function sumPaidRubles(payments: readonly PaymentAmount[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountRubles, 0);
}

export type PaymentAmountWithType = PaymentAmount & {
  readonly type: 'CONTRACT' | 'OTHER';
};

export type PaymentAmountWithTypeAndPaidAt = PaymentAmountWithType & {
  readonly paidAt: Date | null;
};

export function sumPaidRublesByType(payments: readonly PaymentAmountWithTypeAndPaidAt[], type: PaymentAmountWithType['type']): number {
  return payments.reduce((sum, payment) => {
    if (payment.type !== type) return sum;
    if (payment.paidAt == null) return sum;
    return sum + payment.amountRubles;
  }, 0);
}

export function remainingRubles(
  totalAmountRubles: number | null | undefined,
  paidAmountRubles: number,
): number | null {
  if (totalAmountRubles == null) return null;
  return totalAmountRubles - paidAmountRubles;
}

export function canCompleteWithFinance(input: {
  status: string;
  remainingAmountRubles: number | null;
}): boolean {
  if (input.status !== 'ACCEPTED') return false;
  if (input.remainingAmountRubles == null) return true;
  return input.remainingAmountRubles <= 0;
}

export type PaymentAmount = {
  readonly amountKopecks: number;
};

export function sumPaidKopecks(payments: readonly PaymentAmount[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountKopecks, 0);
}

export type PaymentAmountWithType = PaymentAmount & {
  readonly type: 'CONTRACT' | 'OTHER';
};

export type PaymentAmountWithTypeAndPaidAt = PaymentAmountWithType & {
  readonly paidAt: Date | null;
};

export function sumPaidKopecksByType(payments: readonly PaymentAmountWithTypeAndPaidAt[], type: PaymentAmountWithType['type']): number {
  return payments.reduce((sum, payment) => {
    if (payment.type !== type) return sum;
    if (payment.paidAt == null) return sum;
    return sum + payment.amountKopecks;
  }, 0);
}

export function remainingKopecks(
  totalAmountKopecks: number | null | undefined,
  paidAmountKopecks: number,
): number | null {
  if (totalAmountKopecks == null) return null;
  return totalAmountKopecks - paidAmountKopecks;
}

export function canCompleteWithFinance(input: {
  status: string;
  remainingAmountKopecks: number | null;
}): boolean {
  if (input.status !== 'ACCEPTED') return false;
  if (input.remainingAmountKopecks == null) return true;
  return input.remainingAmountKopecks <= 0;
}

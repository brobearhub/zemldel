import { formatRubles } from "@/entities/request";

export function buildRequestCompletionDescription(
  remainingAmountRubles: number,
): string {
  const latePaymentNote =
    remainingAmountRubles > 0
      ? ` Остаток ${formatRubles(remainingAmountRubles)} можно отметить оплаченным позднее.`
      : "";
  return `Работы будут завершены. Добавлять оплаты и отмечать их оплаченными можно и после завершения.${latePaymentNote}`;
}

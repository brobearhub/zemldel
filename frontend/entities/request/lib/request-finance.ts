import type { RequestPaymentItemDto } from "../dto/request.dto";

export function formatRubles(rubles: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

export const PRICE_PANEL_LABEL = "Цена и оплата";

export type RequestPriceView = {
  triggerCaption: string;
  headline: string;
  changedNote: string | null;
  servicePriceLabel: string | null;
  proposedAmount: number | null;
  agreedAmount: number | null;
  /** Установленная сумма для юридически значимых шагов. */
  statedAmount: number | null;
};

/**
 * Справочная цена услуги и установленная цена работ имеют разный смысл.
 */
export function resolveRequestPriceView(input: {
  totalAmountRubles: number | null;
  servicePriceRubles: number | null;
  priceProposal: {
    id: string;
    amountRubles: number;
    authorSide: "CUSTOMER" | "PROVIDER";
  } | null;
}): RequestPriceView {
  const total = input.totalAmountRubles;
  const service = input.servicePriceRubles;
  const servicePriceLabel =
    service != null ? `Справочная цена услуги: ${formatRubles(service)}` : null;
  if (total != null) {
    return {
      triggerCaption: `Цена работ: ${formatRubles(total)}`,
      headline: `Цена работ: ${formatRubles(total)}`,
      changedNote:
        service != null && total !== service
          ? `Отличается от справочной цены услуги`
          : null,
      servicePriceLabel,
      proposedAmount: null,
      agreedAmount: total,
      statedAmount: total,
    };
  }
  return {
    triggerCaption: "Цена работ не указана",
    headline: "Цена работ не указана",
    changedNote: null,
    servicePriceLabel,
    proposedAmount: null,
    agreedAmount: null,
    statedAmount: null,
  };
}

/** Общая сумма заявки в подписи кнопки, если цена работ установлена. */
export function resolvePaymentTriggerLabel(
  input: Parameters<typeof resolveRequestFinanceSummary>[0],
): string {
  const total = resolveRequestFinanceSummary(input).totalAmountRubles;
  return total == null ? "Сумма" : formatRubles(total);
}

export function resolveRequestFinanceSummary(input: {
  totalAmountRubles: number | null;
  paidAmountRubles: number;
  payments: readonly Pick<
    RequestPaymentItemDto,
    "type" | "amountRubles" | "paidAt"
  >[];
}) {
  const expenses = input.payments.filter((payment) => payment.type === "OTHER");
  const expensesAmountRubles = expenses.reduce(
    (sum, payment) => sum + payment.amountRubles,
    0,
  );
  const paidExpensesAmountRubles = expenses.reduce(
    (sum, payment) => sum + (payment.paidAt ? payment.amountRubles : 0),
    0,
  );
  const remainingExpensesAmountRubles =
    expensesAmountRubles - paidExpensesAmountRubles;
  const remainingWorkAmountRubles =
    input.totalAmountRubles == null
      ? null
      : Math.max(input.totalAmountRubles - input.paidAmountRubles, 0);

  return {
    totalAmountRubles:
      input.totalAmountRubles == null
        ? null
        : input.totalAmountRubles + expensesAmountRubles,
    paidAmountRubles: input.paidAmountRubles + paidExpensesAmountRubles,
    remainingAmountRubles:
      remainingWorkAmountRubles == null
        ? null
        : remainingWorkAmountRubles + remainingExpensesAmountRubles,
    remainingWorkAmountRubles,
    // Переплата за работы не погашает дополнительные расходы автоматически.
    overpaidWorkAmountRubles:
      input.totalAmountRubles == null
        ? 0
        : Math.max(input.paidAmountRubles - input.totalAmountRubles, 0),
    expensesAmountRubles,
    paidExpensesAmountRubles,
    remainingExpensesAmountRubles,
  };
}

export function parseRublesInput(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount))
    return null;
  return amount;
}

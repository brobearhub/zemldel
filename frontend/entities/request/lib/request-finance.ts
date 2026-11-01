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
  /** Только согласованная сумма для юридически значимых шагов. */
  statedAmount: number | null;
};

/**
 * Why: справочная, предложенная и согласованная цены имеют разный юридический смысл.
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
  const proposal = input.priceProposal;
  const servicePriceLabel = service != null ? `Справочная цена услуги: ${formatRubles(service)}` : null;
  if (total != null) {
    return {
      triggerCaption: `Согласовано: ${formatRubles(total)}`,
      headline: `Согласовано: ${formatRubles(total)}`,
      changedNote:
        service != null && total !== service ? `Отличается от справочной цены услуги` : null,
      servicePriceLabel,
      proposedAmount: null,
      agreedAmount: total,
      statedAmount: total,
    };
  }
  if (proposal != null) {
    return {
      triggerCaption: `Предложено: ${formatRubles(proposal.amountRubles)}`,
      headline: `Предложено: ${formatRubles(proposal.amountRubles)}`,
      changedNote: null,
      servicePriceLabel,
      proposedAmount: proposal.amountRubles,
      agreedAmount: null,
      statedAmount: null,
    };
  }
  return {
    triggerCaption: "Цена не согласована",
    headline: "Цена не согласована",
    changedNote: null,
    servicePriceLabel,
    proposedAmount: null,
    agreedAmount: null,
    statedAmount: null,
  };
}

/** Подпись кнопки панели. Сумма живёт отдельно и не подменяет название. */
export function resolvePaymentTriggerLabel(_totalAmountRubles: number | null): string {
  return PRICE_PANEL_LABEL;
}

export function parseRublesInput(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) return null;
  return amount;
}

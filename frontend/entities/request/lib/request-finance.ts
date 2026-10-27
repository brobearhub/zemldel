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
  /** Сумма для строки «Цена: …», когда цена уже есть. */
  statedAmount: number | null;
};

/**
 * Why: три состояния из решения владельца, без статусов «предложена / согласована».
 * Снимок услуги остаётся, даже если полную цену потом меняют.
 */
export function resolveRequestPriceView(input: {
  totalAmountRubles: number | null;
  servicePriceRubles: number | null;
}): RequestPriceView {
  const total = input.totalAmountRubles;
  const service = input.servicePriceRubles;
  if (total == null && service == null) {
    return {
      triggerCaption: "Цена не указана",
      headline: "Цена не указана",
      changedNote: null,
      servicePriceLabel: null,
      statedAmount: null,
    };
  }
  const amount = total ?? service;
  if (amount == null) {
    return {
      triggerCaption: "Цена не указана",
      headline: "Цена не указана",
      changedNote: null,
      servicePriceLabel: null,
      statedAmount: null,
    };
  }
  const unchangedService = service != null && (total == null || total === service);
  if (unchangedService) {
    const label = `Цена по услуге: ${formatRubles(service)}`;
    return {
      triggerCaption: label,
      headline: label,
      changedNote: null,
      servicePriceLabel: `Цена услуги: ${formatRubles(service)}`,
      statedAmount: service,
    };
  }
  return {
    triggerCaption: formatRubles(amount),
    headline: formatRubles(amount),
    changedNote:
      service != null ? `Изменена относительно услуги (было ${formatRubles(service)})` : null,
    servicePriceLabel: service != null ? `Цена услуги: ${formatRubles(service)}` : null,
    statedAmount: amount,
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

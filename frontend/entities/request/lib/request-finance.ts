export function formatRubles(rubles: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

/** Подпись кнопки оплаты: сумма, если провайдер задал полную цену. */
export function resolvePaymentTriggerLabel(totalAmountRubles: number | null): string {
  if (totalAmountRubles == null) return "Оплата";
  return formatRubles(totalAmountRubles);
}

export function parseRublesInput(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) return null;
  return amount;
}

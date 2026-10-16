/** Цифры суммы. Пробелы, «₽» и старая приставка «от» отбрасываются. */
export function parseServicePriceAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}

/** Поле ввода: `15000` → `15 000`. */
export function formatServicePriceAmount(raw: string): string {
  const amount = parseServicePriceAmount(raw);
  if (!amount) return "";
  return amount.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Строка карточки и API: `15000` → `15 000 ₽`. */
export function formatServicePriceStored(raw: string): string {
  const grouped = formatServicePriceAmount(raw);
  return grouped ? `${grouped} ₽` : "";
}

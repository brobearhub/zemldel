/**
 * Why: цена услуги хранится строкой («15 000 ₽»), а журнал заявки считает целые рубли.
 * Берём только цифры, как на форме услуги, и не тащим приставку «от».
 */
export function parseServicePriceRubles(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return null;
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 2_147_483_647)
    return null;
  return amount;
}

/** Only a fixed, unambiguous price may become the initial price of a request. */
export function parseFixedServicePriceRubles(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const amount = raw.trim().replace(/\s*₽$/u, '');
  if (!/^(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)$/u.test(amount)) return null;
  return parseServicePriceRubles(amount);
}

export function formatRubles(rubles: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

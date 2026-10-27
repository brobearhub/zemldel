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
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  return amount;
}

export function formatRubles(rubles: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

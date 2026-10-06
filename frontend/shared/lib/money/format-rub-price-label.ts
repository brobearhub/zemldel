export function formatRubPriceLabel(raw: string): string {
  const value = raw.trim();
  if (!value) return value;

  // Если это не числовая цена (например, "Договорная"), валюту не добавляем.
  if (!/\d/.test(value)) return value;

  // Не дублируем знак рубля, если он уже присутствует в строке.
  if (value.includes("₽")) return value;

  return `${value} ₽`;
}


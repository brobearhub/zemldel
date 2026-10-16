export const STOCK_BADGE_MAX_LENGTH = 33;

/** Готовые фразы метки. Исполнитель выбирает их в редакторе услуги и может вписать свою. */
export const STOCK_BADGE_SUGGESTIONS = [
  "Есть свободные даты",
  "Срок от 7 дней",
  "Выезд на участок",
  "Под ключ",
  "По договору",
  "Скидка 10%",
  "Консультация бесплатно",
  "Без предоплаты",
  "С гарантией",
  "Фиксированная цена",
] as const;

function fold(value: string): string {
  return value.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
}

/**
 * Пустое поле и уже выбранная готовая фраза показывают весь список,
 * чтобы можно было переключить метку, не стирая текст.
 * Частичный набор сужает список. Свой текст ничего не предлагает.
 */
export function filterStockBadgeSuggestions(query: string): readonly string[] {
  const needle = fold(query);
  if (!needle) return STOCK_BADGE_SUGGESTIONS;

  const exact = STOCK_BADGE_SUGGESTIONS.some((phrase) => fold(phrase) === needle);
  if (exact) return STOCK_BADGE_SUGGESTIONS;

  return STOCK_BADGE_SUGGESTIONS.filter((phrase) => fold(phrase).includes(needle));
}

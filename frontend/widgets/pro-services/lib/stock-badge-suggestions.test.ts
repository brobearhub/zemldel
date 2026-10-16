import { describe, expect, it } from "vitest";
import {
  STOCK_BADGE_MAX_LENGTH,
  STOCK_BADGE_SUGGESTIONS,
  filterStockBadgeSuggestions,
} from "./stock-badge-suggestions";

describe("filterStockBadgeSuggestions", () => {
  it("возвращает готовые фразы для пустого поля", () => {
    expect(filterStockBadgeSuggestions("")).toEqual([...STOCK_BADGE_SUGGESTIONS]);
    expect(filterStockBadgeSuggestions("   ")).toEqual([...STOCK_BADGE_SUGGESTIONS]);
  });

  it("держит каждую фразу в лимите метки", () => {
    for (const phrase of STOCK_BADGE_SUGGESTIONS) {
      expect(phrase.length).toBeLessThanOrEqual(STOCK_BADGE_MAX_LENGTH);
    }
  });

  it("фильтрует по вхождению без учёта регистра", () => {
    expect(filterStockBadgeSuggestions("скид")).toEqual(["Скидка 10%"]);
    expect(filterStockBadgeSuggestions("ГАРАН")).toEqual(["С гарантией"]);
  });

  it("снова показывает весь список, если в поле уже готовая фраза", () => {
    expect(filterStockBadgeSuggestions("Под ключ")).toEqual([...STOCK_BADGE_SUGGESTIONS]);
  });

  it("ничего не предлагает для своего текста", () => {
    expect(filterStockBadgeSuggestions("Своя пометка")).toEqual([]);
  });
});

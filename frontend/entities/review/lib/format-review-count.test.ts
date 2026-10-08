import { describe, expect, it } from "vitest";
import { formatReviewCount, formatReviewCountGenitive } from "./format-review-count";

describe("formatReviewCount", () => {
  it("склоняет именительный по числу", () => {
    expect(formatReviewCount(1)).toBe("1 отзыв");
    expect(formatReviewCount(2)).toBe("2 отзыва");
    expect(formatReviewCount(5)).toBe("5 отзывов");
    expect(formatReviewCount(11)).toBe("11 отзывов");
    expect(formatReviewCount(21)).toBe("21 отзыв");
  });
});

describe("formatReviewCountGenitive", () => {
  it("склоняет родительный для «на основании»", () => {
    expect(formatReviewCountGenitive(1)).toBe("1 отзыва");
    expect(formatReviewCountGenitive(2)).toBe("2 отзывов");
    expect(formatReviewCountGenitive(5)).toBe("5 отзывов");
    expect(formatReviewCountGenitive(21)).toBe("21 отзыва");
  });
});

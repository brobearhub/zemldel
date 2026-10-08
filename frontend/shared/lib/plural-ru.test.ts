import { describe, expect, it } from "vitest";
import { pluralRu } from "./plural-ru";

const forms = ["отзыв", "отзыва", "отзывов"] as const;

describe("pluralRu", () => {
  it.each([
    [0, "отзывов"],
    [1, "отзыв"],
    [2, "отзыва"],
    [3, "отзыва"],
    [4, "отзыва"],
    [5, "отзывов"],
    [11, "отзывов"],
    [12, "отзывов"],
    [14, "отзывов"],
    [21, "отзыв"],
    [22, "отзыва"],
    [25, "отзывов"],
    [101, "отзыв"],
    [111, "отзывов"],
    [112, "отзывов"],
  ])("выбирает форму для %i", (count, word) => {
    expect(pluralRu(count, forms)).toBe(word);
  });
});

import { pluralRu } from "@/shared/lib/plural-ru";

const NOMINATIVE = ["отзыв", "отзыва", "отзывов"] as const;
/** Родительный после «на основании»: 1 отзыва, 2 отзывов, 5 отзывов. */
const GENITIVE = ["отзыва", "отзывов", "отзывов"] as const;

export function formatReviewCount(count: number): string {
  return `${count} ${pluralRu(count, NOMINATIVE)}`;
}

export function formatReviewCountGenitive(count: number): string {
  return `${count} ${pluralRu(count, GENITIVE)}`;
}

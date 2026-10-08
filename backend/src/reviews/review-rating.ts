export const RATING_BAYESIAN_PRIOR = 4;
export const RATING_BAYESIAN_CONFIDENCE = 5;
export const REVIEW_TEXT_MAX_LENGTH = 2000;

export function bayesianScore(average: number, count: number): number {
  const weight = count / (count + RATING_BAYESIAN_CONFIDENCE);
  const priorWeight = RATING_BAYESIAN_CONFIDENCE / (count + RATING_BAYESIAN_CONFIDENCE);
  return weight * average + priorWeight * RATING_BAYESIAN_PRIOR;
}

export function roundRating(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function displayRating(average: number | null, count: number): number | null {
  if (count <= 0 || average == null || !Number.isFinite(average)) return null;
  return roundRating(average, 1);
}

export function ratingSortScore(average: number | null, count: number): number | null {
  if (count <= 0 || average == null || !Number.isFinite(average)) return null;
  return roundRating(bayesianScore(average, count), 4);
}

export function formatAuthorDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return 'Заказчик';
  const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);
  if (parts.length < 2) return parts[0] ?? 'Заказчик';
  const initial = parts[1].charAt(0).toLocaleUpperCase('ru-RU');
  return `${parts[0]} ${initial}.`;
}

export function normalizeReviewText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

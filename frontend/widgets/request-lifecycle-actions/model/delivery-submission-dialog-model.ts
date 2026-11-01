export function normalizeDeliverySummary(value: string): string | null {
  const summary = value.trim();
  return summary.length >= 1 && summary.length <= 2000 ? summary : null;
}

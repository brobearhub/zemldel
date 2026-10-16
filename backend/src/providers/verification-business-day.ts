/** Срок «1 рабочий день»: суббота и воскресенье не считаются. Календарь — UTC, не пояс браузера. */
export function isOlderThanOneBusinessDay(
  submittedAt: Date,
  now: Date,
): boolean {
  return now.getTime() > addBusinessDays(submittedAt, 1).getTime();
}

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return result;
}

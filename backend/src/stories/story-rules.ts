export const STORY_DURATION_DAYS = [1, 2, 3, 7] as const;
export type StoryDurationDays = (typeof STORY_DURATION_DAYS)[number];

export const STORY_TEXT_MAX_LENGTH = 500;
export const STORY_FEED_LIMIT = 30;
export const STORY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const DURATION_SET = new Set<number>(STORY_DURATION_DAYS);

export function parseStoryDurationDays(value: unknown): StoryDurationDays | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || !DURATION_SET.has(parsed)) return null;
  return parsed as StoryDurationDays;
}

export function computeStoryExpiresAt(publishedAt: Date, durationDays: StoryDurationDays): Date {
  return new Date(publishedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

/** Multipart присылает перевод строки как CRLF. Для лимита это один символ. */
export function collapseStoryLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function normalizeStoryText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = collapseStoryLineEndings(value).trim();
  if (trimmed.length === 0 || trimmed.length > STORY_TEXT_MAX_LENGTH) return null;
  return trimmed;
}

export function mergeCityFirstStories<T>(
  cityStories: readonly T[],
  otherStories: readonly T[],
  limit = STORY_FEED_LIMIT,
): T[] {
  return [...cityStories, ...otherStories].slice(0, limit);
}

export function isStoryExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isStoryInFeed(story: { expiresAt: Date; withdrawnAt: Date | null }, now = new Date()): boolean {
  return story.withdrawnAt == null && story.expiresAt.getTime() > now.getTime();
}

export type StoryFeedReason = 'visible' | 'expired' | 'withdrawn';

export function storyFeedReason(
  story: { expiresAt: Date; withdrawnAt: Date | null },
  now = new Date(),
): StoryFeedReason {
  if (story.withdrawnAt != null) return 'withdrawn';
  if (isStoryExpired(story.expiresAt, now)) return 'expired';
  return 'visible';
}

export type StoryFeedSortItem = {
  id: string;
  publishedAt: number;
  cityId: string | null;
  followed: boolean;
  viewed: boolean;
};

export function orderStoryFeed(
  items: readonly StoryFeedSortItem[],
  cityId: string | null,
  limit = STORY_FEED_LIMIT,
): StoryFeedSortItem[] {
  const byFresh = (left: StoryFeedSortItem, right: StoryFeedSortItem) => right.publishedAt - left.publishedAt;
  const followed = items.filter((item) => item.followed);
  const rest = items.filter((item) => !item.followed);
  const cityThenRest = (group: StoryFeedSortItem[]) => {
    if (!cityId) return [...group].sort(byFresh);
    return [
      ...group.filter((item) => item.cityId === cityId).sort(byFresh),
      ...group.filter((item) => item.cityId !== cityId).sort(byFresh),
    ];
  };
  const ordered = [
    ...followed.filter((item) => !item.viewed).sort(byFresh),
    ...followed.filter((item) => item.viewed).sort(byFresh),
    ...cityThenRest(rest.filter((item) => !item.viewed)),
    ...cityThenRest(rest.filter((item) => item.viewed)),
  ];
  return ordered.slice(0, limit);
}

const FALLBACK_TIME_ZONE = 'Europe/Moscow';

export function resolveInsightsTimeZone(value: string | null | undefined): string {
  const candidate = value?.trim() || FALLBACK_TIME_ZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function storyHourKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}`;
}

export function buildHourlyViewChart(input: {
  from: Date;
  to: Date;
  viewedAt: readonly Date[];
  timeZone: string;
}): Array<{ hour: string; viewCount: number }> {
  const timeZone = resolveInsightsTimeZone(input.timeZone);
  const counts = new Map<string, number>();
  const end = input.to.getTime() < input.from.getTime() ? input.from : input.to;
  for (let cursor = input.from.getTime(); cursor <= end.getTime(); cursor += 60 * 60 * 1000) {
    counts.set(storyHourKey(new Date(cursor), timeZone), 0);
  }
  counts.set(storyHourKey(end, timeZone), counts.get(storyHourKey(end, timeZone)) ?? 0);
  for (const viewedAt of input.viewedAt) {
    if (viewedAt.getTime() < input.from.getTime() || viewedAt.getTime() > end.getTime()) continue;
    const key = storyHourKey(viewedAt, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([hour, viewCount]) => ({ hour, viewCount }));
}

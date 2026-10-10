import type { StoryInsightsDto } from "@/entities/story";
import { pluralRu } from "@/shared/lib/plural-ru";

export type InsightTileId =
  | "viewers"
  | "guests"
  | "saves"
  | "profileOpens"
  | "guestProfileOpens"
  | "replies"
  | "comments";

export type InsightListRow = {
  key: string;
  name: string;
  initial: string;
  detail: string | null;
  when: string;
};

export type InsightTile = {
  id: InsightTileId;
  label: string;
  count: number;
  rows: InsightListRow[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type HourlyRangeId = "today" | "3d" | "week" | "month" | "year" | "custom";

export const HOURLY_RANGES: ReadonlyArray<{ id: HourlyRangeId; label: string; days: number | null }> = [
  { id: "today", label: "Сегодня", days: 1 },
  { id: "3d", label: "3 дня", days: 3 },
  { id: "week", label: "Неделя", days: 7 },
  { id: "month", label: "Месяц", days: 30 },
  { id: "year", label: "Год", days: 365 },
  { id: "custom", label: "Свой диапазон", days: null },
];

export type HourlyBar = {
  hour: number;
  count: number;
  peak: boolean;
};

export type HourlyChart = {
  bars: HourlyBar[];
  caption: string;
  periodLabel: string;
  total: number;
  peakHour: number | null;
};

export function calendarDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(year, (month ?? 1) - 1, date ?? 1);
  next.setDate(next.getDate() + delta);
  return calendarDayKey(next);
}

function hourlyWindow(
  range: HourlyRangeId,
  now: Date,
  custom?: { from: string; to: string },
): { from: string; to: string; label: string } {
  const today = calendarDayKey(now);
  const preset = HOURLY_RANGES.find((item) => item.id === range);
  if (range === "custom" && custom?.from && custom.to) {
    const from = custom.from <= custom.to ? custom.from : custom.to;
    const to = custom.from <= custom.to ? custom.to : custom.from;
    return { from, to, label: "Свой диапазон" };
  }
  if (range === "custom" || range === "today") {
    return { from: today, to: today, label: "Сегодня" };
  }
  const days = preset?.days ?? 1;
  return { from: shiftDay(today, -(days - 1)), to: today, label: preset?.label ?? "Сегодня" };
}

export function buildHourlyChart(
  hourly: ReadonlyArray<{ hour: string; viewCount: number }>,
  range: HourlyRangeId,
  now: Date,
  custom?: { from: string; to: string },
): HourlyChart {
  const span = hourlyWindow(range, now, custom);
  const counts = Array.from({ length: 24 }, () => 0);
  for (const point of hourly) {
    const [day, hourText] = point.hour.split("T");
    if (!day || hourText == null || day < span.from || day > span.to) continue;
    const hour = Number(hourText);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    counts[hour] += point.viewCount;
  }

  let peakHour = -1;
  let peakCount = 0;
  for (let hour = 0; hour < counts.length; hour += 1) {
    if (counts[hour] > peakCount) {
      peakCount = counts[hour];
      peakHour = hour;
    }
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  const peak = peakHour >= 0 ? peakHour : null;
  const peakLabel = peak == null ? "" : ` · пик в ${String(peak).padStart(2, "0")}:00`;

  return {
    bars: counts.map((count, hour) => ({ hour, count, peak: peak === hour })),
    caption: `${span.label} · ${total} просм.${peakLabel}`,
    periodLabel: span.label,
    total,
    peakHour: peak,
  };
}

export function viewsWord(count: number): string {
  return pluralRu(count, ["просмотр", "просмотра", "просмотров"]);
}

export function formatInsightAge(iso: string, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - new Date(iso).getTime());
  if (elapsed < HOUR_MS) return `${Math.max(1, Math.floor(elapsed / 60_000))} мин`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} ч`;
  return `${Math.floor(elapsed / DAY_MS)} д`;
}

export type ViewMixSliceId = "users" | "guests" | "repeats";

export type ViewMixSlice = {
  id: ViewMixSliceId;
  label: string;
  count: number;
  percent: number;
};

export type ViewMix = {
  total: number;
  slices: readonly [ViewMixSlice, ViewMixSlice, ViewMixSlice];
};

/**
 * Кольцо всех показов сторис: уникальные вошедшие, гости и повторные сверх них.
 * Проценты — доли от суммы показов, округление наибольших остатков, в сумме 100.
 */
export function buildViewMix(input: {
  viewCount: number;
  uniqueViewerCount: number;
  guestViewCount: number;
}): ViewMix {
  const total = Math.max(0, input.viewCount);
  const users = Math.min(Math.max(0, input.uniqueViewerCount), total);
  const guests = Math.min(Math.max(0, input.guestViewCount), total - users);
  const repeats = total - users - guests;
  const percents = sharePercents([users, guests, repeats]);

  return {
    total,
    slices: [
      { id: "users", label: "Пользователи", count: users, percent: percents[0] ?? 0 },
      { id: "guests", label: "Гости", count: guests, percent: percents[1] ?? 0 },
      { id: "repeats", label: "Повторные", count: repeats, percent: percents[2] ?? 0 },
    ],
  };
}

function sharePercents(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((count) => (count / total) * 100);
  const floors = raw.map((value) => Math.floor(value));
  let leftover = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - (floors[index] ?? 0) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  const result = [...floors];
  for (const item of order) {
    if (leftover <= 0) break;
    result[item.index] = (result[item.index] ?? 0) + 1;
    leftover -= 1;
  }
  return result;
}

function firstInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toLocaleUpperCase("ru-RU");
}

function cityLine(cityName: string | null): string {
  return cityName ?? "город не указан";
}

export function buildInsightTiles(insights: StoryInsightsDto, now: Date): InsightTile[] {
  return [
    {
      id: "viewers",
      label: "Пользователи",
      count: insights.uniqueViewerCount,
      rows: insights.viewers.map((viewer) => ({
        key: viewer.userId,
        name: viewer.name,
        initial: firstInitial(viewer.name),
        detail: `${cityLine(viewer.cityName)} · ${viewer.viewCount} ${viewsWord(viewer.viewCount)}`,
        when: formatInsightAge(viewer.lastViewedAt, now),
      })),
    },
    {
      id: "guests",
      label: "Гости",
      count: insights.guestViewCount,
      rows: insights.guestViews.map((view, index) => ({
        key: `${view.viewedAt}-${index}`,
        name: "Гость",
        initial: "Г",
        detail: null,
        when: formatInsightAge(view.viewedAt, now),
      })),
    },
    {
      id: "saves",
      label: "Сохранили",
      count: insights.saveCount,
      rows: insights.saves.map((save) => ({
        key: save.userId,
        name: save.name,
        initial: firstInitial(save.name),
        detail: cityLine(save.cityName),
        when: formatInsightAge(save.savedAt, now),
      })),
    },
    {
      id: "profileOpens",
      label: "Переходы в профиль",
      count: insights.profileOpens.length,
      rows: insights.profileOpens.map((open) => ({
        key: `${open.userId}-${open.openedAt}`,
        name: open.name,
        initial: firstInitial(open.name),
        detail: cityLine(open.cityName),
        when: formatInsightAge(open.openedAt, now),
      })),
    },
    {
      id: "guestProfileOpens",
      label: "Гостевые переходы",
      count: insights.guestProfileOpenCount,
      rows: insights.guestProfileOpens.map((open, index) => ({
        key: `${open.openedAt}-${index}`,
        name: "Гость",
        initial: "Г",
        detail: null,
        when: formatInsightAge(open.openedAt, now),
      })),
    },
    {
      id: "replies",
      label: "Ответы",
      count: insights.replies.length,
      rows: insights.replies.map((reply) => ({
        key: reply.id,
        name: reply.name,
        initial: firstInitial(reply.name),
        detail: `«${reply.text}»`,
        when: formatInsightAge(reply.createdAt, now),
      })),
    },
    {
      id: "comments",
      label: "Комментарии",
      count: insights.comments.length,
      rows: insights.comments.map((comment) => ({
        key: comment.id,
        name: comment.name,
        initial: firstInitial(comment.name),
        detail: `«${comment.text}» · ${comment.likeCount}`,
        when: formatInsightAge(comment.createdAt, now),
      })),
    },
  ];
}

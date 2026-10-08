import { pluralRu } from "@/shared/lib/plural-ru";
import type { StoryDurationDays } from "@/entities/story/dto/story.dto";

export const STORY_DURATION_OPTIONS: readonly StoryDurationDays[] = [1, 2, 3, 7];
export const STORY_TEXT_MAX_LENGTH = 500;
export const STORY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Длина в кодовых единицах UTF-16 — как @MaxLength на сервере. */
export function clampStoryText(value: string): string {
  return value.length <= STORY_TEXT_MAX_LENGTH ? value : value.slice(0, STORY_TEXT_MAX_LENGTH);
}

export function formatStoryDuration(days: number): string {
  return `${days} ${pluralRu(days, ["день", "дня", "дней"])}`;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Остаток показа для бейджа на карточке: «18 ч» или «2 д». */
export function formatStoryRemaining(expiresAt: string, nowMs: number = Date.now()): string | null {
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return null;
  const diff = expiresMs - nowMs;
  if (diff <= 0) return null;
  if (diff < DAY_MS) {
    const hours = Math.max(1, Math.ceil(diff / HOUR_MS));
    return `${hours} ч`;
  }
  const days = Math.ceil(diff / DAY_MS);
  return `${days} д`;
}

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { localDay, nextMidnight, type Plan } from '../billing/plan-policy';

export const STORY_PLAN_LIMITS = {
  STANDARD: {
    dailyLimit: 1,
    durationHours: [24],
    textLimit: 500,
    textFormat: 'PLAIN',
    video: false,
  },
  LITE: {
    dailyLimit: 5,
    durationHours: [24, 48],
    textLimit: 1000,
    textFormat: 'BASIC',
    video: false,
  },
  BUSINESS: {
    dailyLimit: 20,
    durationHours: [6, 12, 24, 48],
    textLimit: 2048,
    textFormat: 'LINKS',
    video: true,
  },
} as const;

export function validateStoryPlan(
  plan: Plan,
  input: { text: string; durationHours: number; video: boolean },
) {
  const limits = STORY_PLAN_LIMITS[plan];
  if (input.text.length > limits.textLimit)
    throw new BadRequestException(
      `На вашем тарифе текст истории — до ${limits.textLimit} символов`,
    );
  if (
    !(limits.durationHours as readonly number[]).includes(input.durationHours)
  )
    throw new ForbiddenException('Этот срок показа недоступен на вашем тарифе');
  if (input.video && !limits.video)
    throw new ForbiddenException('Видео в историях доступно на тарифе Бизнес');
  return limits;
}

/** Calendar day in the account time zone; works for 23/25-hour DST days too. */
export function storyDayWindow(now: Date, timezone: string) {
  const day = localDay(now, timezone);
  let low = now.getTime() - 27 * 3600000;
  let high = now.getTime();
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (localDay(new Date(mid), timezone) === day) high = mid;
    else low = mid;
  }
  return { start: new Date(high), end: nextMidnight(now, timezone) };
}

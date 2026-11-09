import { describe, expect, it } from 'vitest';
import { storyDayWindow, validateStoryPlan } from './story-plan';

describe('story plan rules', () => {
  it.each([
    ['STANDARD', 500, 24, false],
    ['LITE', 1000, 48, false],
    ['BUSINESS', 2048, 6, true],
  ] as const)(
    '%s validates its exact text and media boundary',
    (plan, length, durationHours, video) => {
      expect(() =>
        validateStoryPlan(plan, {
          text: 'я'.repeat(length),
          durationHours,
          video,
        }),
      ).not.toThrow();
      expect(() =>
        validateStoryPlan(plan, {
          text: 'я'.repeat(length + 1),
          durationHours,
          video,
        }),
      ).toThrow();
    },
  );
  it('rejects paid durations and video on lower plans', () => {
    expect(() =>
      validateStoryPlan('STANDARD', {
        text: 'Фото',
        durationHours: 48,
        video: false,
      }),
    ).toThrow();
    expect(() =>
      validateStoryPlan('LITE', {
        text: 'Фото',
        durationHours: 12,
        video: false,
      }),
    ).toThrow();
    for (const plan of ['STANDARD', 'LITE'] as const)
      expect(() =>
        validateStoryPlan(plan, {
          text: 'Видео',
          durationHours: 24,
          video: true,
        }),
      ).toThrow();
  });
  it('uses local midnight and survives DST changes', () => {
    const moscow = storyDayWindow(
      new Date('2026-11-09T21:01:00Z'),
      'Europe/Moscow',
    );
    expect(moscow.start.toISOString()).toBe('2026-11-09T21:00:00.000Z');
    expect(moscow.end.toISOString()).toBe('2026-11-10T21:00:00.000Z');
    for (const [date, hours] of [
      ['2026-03-29T12:00:00Z', 23],
      ['2026-10-25T12:00:00Z', 25],
    ] as const) {
      const window = storyDayWindow(new Date(date), 'Europe/Berlin');
      expect(window.end.getTime() - window.start.getTime()).toBe(
        hours * 3600000,
      );
    }
  });
});

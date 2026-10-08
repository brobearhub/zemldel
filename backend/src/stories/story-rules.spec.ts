import { describe, expect, it } from 'vitest';
import {
  buildHourlyViewChart,
  computeStoryExpiresAt,
  isStoryInFeed,
  mergeCityFirstStories,
  collapseStoryLineEndings,
  normalizeStoryText,
  orderStoryFeed,
  parseStoryDurationDays,
  resolveInsightsTimeZone,
  storyFeedReason,
  STORY_FEED_LIMIT,
  STORY_TEXT_MAX_LENGTH,
} from './story-rules';

describe('parseStoryDurationDays', () => {
  it('принимает 1, 2, 3 и 7 дней', () => {
    expect(parseStoryDurationDays(1)).toBe(1);
    expect(parseStoryDurationDays(2)).toBe(2);
    expect(parseStoryDurationDays(3)).toBe(3);
    expect(parseStoryDurationDays(7)).toBe(7);
  });

  it('принимает строку с допустимым числом', () => {
    expect(parseStoryDurationDays('3')).toBe(3);
  });

  it('отклоняет срок вне набора', () => {
    expect(parseStoryDurationDays(5)).toBeNull();
    expect(parseStoryDurationDays(0)).toBeNull();
    expect(parseStoryDurationDays('8')).toBeNull();
    expect(parseStoryDurationDays('abc')).toBeNull();
  });
});

describe('computeStoryExpiresAt', () => {
  it('прибавляет выбранные сутки к publishedAt', () => {
    const publishedAt = new Date('2026-10-06T12:00:00.000Z');
    expect(computeStoryExpiresAt(publishedAt, 1).toISOString()).toBe(
      '2026-10-07T12:00:00.000Z',
    );
    expect(computeStoryExpiresAt(publishedAt, 7).toISOString()).toBe(
      '2026-10-13T12:00:00.000Z',
    );
  });
});

describe('normalizeStoryText', () => {
  it('обрезает пробелы и принимает текст в лимите', () => {
    expect(normalizeStoryText('  Привет  ')).toBe('Привет');
  });

  it('отклоняет пустой текст', () => {
    expect(normalizeStoryText('   ')).toBeNull();
    expect(normalizeStoryText('')).toBeNull();
    expect(normalizeStoryText(null)).toBeNull();
  });

  it('отклоняет текст длиннее лимита', () => {
    expect(normalizeStoryText('а'.repeat(STORY_TEXT_MAX_LENGTH + 1))).toBeNull();
  });

  it('считает CRLF из multipart одним символом', () => {
    const text = `${Array.from({ length: 50 }, () => 'а'.repeat(9)).join('\n')}б`;
    const wire = text.replace(/\n/g, '\r\n');
    expect(text).toHaveLength(STORY_TEXT_MAX_LENGTH);
    expect(wire.length).toBeGreaterThan(STORY_TEXT_MAX_LENGTH);
    expect(collapseStoryLineEndings(wire)).toBe(text);
    expect(normalizeStoryText(wire)).toBe(text);
  });
});

describe('mergeCityFirstStories', () => {
  it('ставит городские сторис первыми и режет общий лимит', () => {
    const city = [{ id: 'c1' }, { id: 'c2' }];
    const other = [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }];
    expect(mergeCityFirstStories(city, other, 3)).toEqual([
      { id: 'c1' },
      { id: 'c2' },
      { id: 'o1' },
    ]);
  });

  it('без городских оставляет только остальные в лимите', () => {
    expect(mergeCityFirstStories([], [{ id: 'o1' }, { id: 'o2' }], 1)).toEqual([
      { id: 'o1' },
    ]);
  });

  it('использует лимит ленты по умолчанию', () => {
    const city = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}` }));
    const other = Array.from({ length: 20 }, (_, i) => ({ id: `o${i}` }));
    const merged = mergeCityFirstStories(city, other);
    expect(merged).toHaveLength(STORY_FEED_LIMIT);
    expect(merged[0]?.id).toBe('c0');
    expect(merged[20]?.id).toBe('o0');
  });
});

describe('story feed visibility', () => {
  const now = new Date('2026-10-07T12:00:00.000Z');

  it('считает сторис в показе, пока срок не вышел и её не сняли', () => {
    expect(isStoryInFeed({ expiresAt: new Date('2026-10-08T12:00:00.000Z'), withdrawnAt: null }, now)).toBe(true);
    expect(storyFeedReason({ expiresAt: new Date('2026-10-08T12:00:00.000Z'), withdrawnAt: null }, now)).toBe('visible');
  });

  it('отличает срок от снятия автором', () => {
    expect(storyFeedReason({ expiresAt: new Date('2026-10-01T12:00:00.000Z'), withdrawnAt: null }, now)).toBe('expired');
    expect(
      storyFeedReason(
        { expiresAt: new Date('2026-10-08T12:00:00.000Z'), withdrawnAt: new Date('2026-10-07T10:00:00.000Z') },
        now,
      ),
    ).toBe('withdrawn');
  });
});

describe('orderStoryFeed', () => {
  const item = (
    id: string,
    publishedAt: string,
    flags: { followed?: boolean; viewed?: boolean; cityId?: string | null },
  ) => ({
    id,
    publishedAt: new Date(publishedAt).getTime(),
    cityId: flags.cityId ?? null,
    followed: flags.followed ?? false,
    viewed: flags.viewed ?? false,
  });

  it('ставит непросмотренные подписки раньше остальных и города', () => {
    const ordered = orderStoryFeed(
      [
        item('city-new', '2026-10-07T10:00:00.000Z', { cityId: 'city' }),
        item('follow-seen', '2026-10-07T11:00:00.000Z', { followed: true, viewed: true }),
        item('follow-unseen', '2026-10-07T09:00:00.000Z', { followed: true }),
      ],
      'city',
    );
    expect(ordered.map((entry) => entry.id)).toEqual(['follow-unseen', 'follow-seen', 'city-new']);
  });

  it('внутри остальных сначала непросмотренные, и уже среди них город', () => {
    const ordered = orderStoryFeed(
      [
        item('other-unseen', '2026-10-07T12:00:00.000Z', {}),
        item('city-seen', '2026-10-07T11:00:00.000Z', { cityId: 'city', viewed: true }),
        item('city-unseen', '2026-10-07T08:00:00.000Z', { cityId: 'city' }),
      ],
      'city',
    );
    expect(ordered.map((entry) => entry.id)).toEqual(['city-unseen', 'other-unseen', 'city-seen']);
  });
});

describe('buildHourlyViewChart', () => {
  it('принимает IANA-пояс и падает на Москву, если пояс пустой', () => {
    expect(resolveInsightsTimeZone('Asia/Yekaterinburg')).toBe('Asia/Yekaterinburg');
    expect(resolveInsightsTimeZone('Not/AZone')).toBe('Europe/Moscow');
  });

  it('кладёт просмотр в час пояса зрителя инсайтов и оставляет пустые часы', () => {
    const chart = buildHourlyViewChart({
      from: new Date('2026-10-07T17:10:00.000Z'),
      to: new Date('2026-10-07T18:40:00.000Z'),
      viewedAt: [new Date('2026-10-07T17:20:00.000Z')],
      timeZone: 'Asia/Yekaterinburg',
    });
    const hit = chart.find((bar) => bar.viewCount === 1);
    expect(hit?.hour).toBe('2026-10-07T22');
    expect(chart.some((bar) => bar.viewCount === 0)).toBe(true);
  });
});

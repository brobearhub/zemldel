import { describe, expect, it } from "vitest";
import type { StoryInsightsDto } from "@/entities/story";
import { buildHourlyChart, buildInsightTiles, buildViewMix, calendarDayKey, formatInsightAge, viewsWord } from "./story-insights";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function insights(overrides: Partial<StoryInsightsDto> = {}): StoryInsightsDto {
  return {
    viewCount: 6,
    guestViewCount: 2,
    uniqueViewerCount: 1,
    hourly: [],
    viewers: [
      {
        userId: "u1",
        name: "Pavel Usov",
        viewCount: 3,
        lastViewedAt: "2026-10-07T10:00:00.000Z",
        cityName: "Екатеринбург",
      },
    ],
    guestViews: [{ viewedAt: "2026-10-07T11:00:00.000Z" }],
    cities: [],
    profileOpenCount: 2,
    guestProfileOpenCount: 1,
    profileOpens: [
      {
        userId: "u1",
        name: "Pavel Usov",
        cityName: "Екатеринбург",
        openedAt: "2026-10-07T10:00:00.000Z",
      },
    ],
    guestProfileOpens: [{ openedAt: "2026-10-07T11:00:00.000Z" }],
    replies: [
      {
        id: "r1",
        authorUserId: "u2",
        text: "Очень красиво!",
        name: "Анна Ким",
        cityName: "Москва",
        createdAt: "2026-10-07T09:00:00.000Z",
      },
    ],
    reposts: [
      {
        storyId: "s2",
        name: "Илья Орлов",
        text: "Закат на Исети",
        publishedAt: "2026-10-07T07:00:00.000Z",
      },
    ],
    saveCount: 1,
    saves: [
      {
        userId: "u2",
        name: "Анна Ким",
        cityName: "Москва",
        savedAt: "2026-10-07T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("formatInsightAge", () => {
  it("считает минуты, часы и дни", () => {
    expect(formatInsightAge("2026-10-07T11:20:00.000Z", NOW)).toBe("40 мин");
    expect(formatInsightAge("2026-10-07T10:00:00.000Z", NOW)).toBe("2 ч");
    expect(formatInsightAge("2026-10-05T12:00:00.000Z", NOW)).toBe("2 д");
  });
});

describe("buildViewMix", () => {
  it("делит показы на пользователей, гостей и повторные и добивает проценты до 100", () => {
    expect(buildViewMix({ viewCount: 6, uniqueViewerCount: 3, guestViewCount: 2 })).toEqual({
      total: 6,
      slices: [
        { id: "users", label: "Пользователи", count: 3, percent: 50 },
        { id: "guests", label: "Гости", count: 2, percent: 33 },
        { id: "repeats", label: "Повторные", count: 1, percent: 17 },
      ],
    });
  });

  it("пустую сводку оставляет нулями", () => {
    const mix = buildViewMix({ viewCount: 0, uniqueViewerCount: 0, guestViewCount: 0 });
    expect(mix.total).toBe(0);
    expect(mix.slices.map((slice) => slice.percent)).toEqual([0, 0, 0]);
  });

  it("не даёт частям превысить число показов", () => {
    const mix = buildViewMix({ viewCount: 1, uniqueViewerCount: 4, guestViewCount: 2 });
    expect(mix.slices.map((slice) => slice.count)).toEqual([1, 0, 0]);
  });
});

describe("buildInsightTiles", () => {
  it("собирает подписи плиток и строки списков", () => {
    const tiles = buildInsightTiles(insights(), NOW);
    expect(tiles.map((tile) => [tile.label, tile.count])).toEqual([
      ["Пользователи", 1],
      ["Гости", 2],
      ["Сохранили", 1],
      ["Переходы в профиль", 1],
      ["Гостевые переходы", 1],
      ["Ответы", 1],
      ["Репосты", 1],
    ]);

    const viewers = tiles[0].rows[0];
    expect(viewers).toMatchObject({
      name: "Pavel Usov",
      initial: "P",
      detail: `Екатеринбург · 3 ${viewsWord(3)}`,
      when: "2 ч",
    });
    expect(tiles[1].rows[0]).toMatchObject({ name: "Гость", initial: "Г", detail: null, when: "1 ч" });
    expect(tiles[5].rows[0].detail).toBe("«Очень красиво!»");
    expect(tiles[6].rows[0]).toMatchObject({
      name: "Закат на Исети",
      initial: "И",
      detail: "Репостнул(а) Илья Орлов",
    });
  });
});

describe("buildHourlyChart", () => {
  const today = calendarDayKey(NOW);
  const yesterday = calendarDayKey(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1));
  const older = calendarDayKey(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 10));

  it("сегодня берёт только сегодняшний час, пик — более ранний максимум", () => {
    const chart = buildHourlyChart(
      [
        { hour: `${today}T11`, viewCount: 4 },
        { hour: `${today}T18`, viewCount: 4 },
        { hour: `${yesterday}T11`, viewCount: 9 },
      ],
      "today",
      NOW,
    );

    expect(chart.bars[11]).toEqual({ hour: 11, count: 4, peak: true });
    expect(chart.bars[18]).toEqual({ hour: 18, count: 4, peak: false });
    expect(chart.caption).toBe("Сегодня · 8 просм. · пик в 11:00");
    expect(chart.periodLabel).toBe("Сегодня");
  });

  it("три дня складывают один и тот же час разных дат", () => {
    const chart = buildHourlyChart(
      [
        { hour: `${today}T11`, viewCount: 2 },
        { hour: `${yesterday}T11`, viewCount: 3 },
        { hour: `${older}T11`, viewCount: 7 },
      ],
      "3d",
      NOW,
    );

    expect(chart.bars[11].count).toBe(5);
    expect(chart.caption).toBe("3 дня · 5 просм. · пик в 11:00");
  });

  it("пустой свой диапазон совпадает с сегодня", () => {
    const chart = buildHourlyChart([{ hour: `${today}T09`, viewCount: 1 }], "custom", NOW, { from: "", to: "" });
    expect(chart.caption).toBe("Сегодня · 1 просм. · пик в 09:00");
  });
});

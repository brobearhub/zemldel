import { describe, expect, it } from "vitest";
import { formatInboxPreview, formatInboxTime, storyMarkerLabel, withSentPreview } from "./inbox-format";

describe("formatInboxPreview", () => {
  it("помечает своё последнее сообщение", () => {
    expect(formatInboxPreview("Спасибо!", true)).toBe("Вы: Спасибо!");
    expect(formatInboxPreview("Спасибо!", false)).toBe("Спасибо!");
  });
});

describe("formatInboxTime", () => {
  const now = new Date(2026, 9, 7, 12, 0, 0);

  it("сегодня показывает время, вчера — слово, старше — дату", () => {
    const today = new Date(2026, 9, 7, 9, 13, 0);
    const yesterday = new Date(2026, 9, 6, 18, 0, 0);
    const older = new Date(2026, 9, 5, 12, 5, 0);

    expect(formatInboxTime(today.toISOString(), now)).toBe(
      new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(today),
    );
    expect(formatInboxTime(yesterday.toISOString(), now)).toBe("вчера");
    expect(formatInboxTime(older.toISOString(), now)).toBe(
      new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(older),
    );
  });
});

describe("storyMarkerLabel", () => {
  it("собирает подпись истории", () => {
    expect(storyMarkerLabel("Закат на Исети")).toBe("Ответ на историю «Закат на Исети»");
  });
});

describe("withSentPreview", () => {
  it("обновляет превью отправленного и поднимает диалог", () => {
    const items = withSentPreview(
      [
        {
          id: "user:a",
          name: "Анна",
          imageUrl: null,
          cityName: null,
          storyTitles: ["Закат"],
          preview: "Привет",
          lastMessageAt: "2026-10-07T10:00:00.000Z",
          unreadCount: 1,
        },
        {
          id: "user:b",
          name: "Илья",
          imageUrl: "https://cdn.example/ilya.jpg",
          cityName: null,
          storyTitles: ["Кофе"],
          preview: "Ок",
          lastMessageAt: "2026-10-07T12:00:00.000Z",
          unreadCount: 0,
        },
      ],
      "user:a",
      "Спасибо",
      "2026-10-07T13:00:00.000Z",
    );

    expect(items.map((item) => item.id)).toEqual(["user:a", "user:b"]);
    expect(items[0]).toMatchObject({ preview: "Вы: Спасибо", unreadCount: 0 });
  });
});

import { describe, expect, it } from "vitest";
import { clampStoryText, formatStoryDuration, formatStoryRemaining, STORY_TEXT_MAX_LENGTH } from "./story-duration";

describe("clampStoryText", () => {
  it("оставляет строку, которая уже в лимите", () => {
    const exact = "а".repeat(STORY_TEXT_MAX_LENGTH);
    expect(clampStoryText(exact)).toBe(exact);
    expect(clampStoryText("")).toBe("");
  });

  it("обрезает длинный текст до лимита", () => {
    const long = "б".repeat(STORY_TEXT_MAX_LENGTH + 2500);
    expect(clampStoryText(long)).toBe("б".repeat(STORY_TEXT_MAX_LENGTH));
  });
});

describe("formatStoryDuration", () => {
  it("склоняет срок", () => {
    expect(formatStoryDuration(1)).toBe("1 день");
    expect(formatStoryDuration(2)).toBe("2 дня");
    expect(formatStoryDuration(3)).toBe("3 дня");
    expect(formatStoryDuration(7)).toBe("7 дней");
  });
});

describe("formatStoryRemaining", () => {
  const now = Date.parse("2026-10-07T12:00:00.000Z");

  it("показывает часы, пока до конца меньше суток", () => {
    expect(formatStoryRemaining("2026-10-08T06:00:00.000Z", now)).toBe("18 ч");
    expect(formatStoryRemaining("2026-10-07T12:20:00.000Z", now)).toBe("1 ч");
  });

  it("показывает дни, когда осталось больше суток", () => {
    expect(formatStoryRemaining("2026-10-09T12:00:00.000Z", now)).toBe("2 д");
  });

  it("не показывает бейдж у уже завершённой сторис", () => {
    expect(formatStoryRemaining("2026-10-07T11:00:00.000Z", now)).toBeNull();
  });
});

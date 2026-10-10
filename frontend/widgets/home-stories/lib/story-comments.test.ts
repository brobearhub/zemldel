import { describe, expect, it } from "vitest";
import { commentWasEdited, mergeStoryComments } from "./story-comments";

describe("mergeStoryComments", () => {
  it("оставляет локальный комментарий, которого ещё нет в ответе", () => {
    const server = [{ id: "a", text: "сервер" }];
    const local = [
      { id: "a", text: "старый" },
      { id: "pending-1", text: "новый" },
    ];
    expect(mergeStoryComments(server, local)).toEqual([
      { id: "a", text: "сервер" },
      { id: "pending-1", text: "новый" },
    ]);
  });
});

describe("commentWasEdited", () => {
  it("считает правкой только заметную разницу времени", () => {
    expect(commentWasEdited("2026-10-08T10:00:00.000Z", "2026-10-08T10:00:00.200Z")).toBe(false);
    expect(commentWasEdited("2026-10-08T10:00:00.000Z", "2026-10-08T10:00:02.000Z")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { liftUnseenStories, markStoriesViewed } from "./guest-story-views";

describe("markStoriesViewed", () => {
  it("оставляет просмотр, даже если сервер снова прислал непросмотренную сторис", () => {
    const items = [
      { id: "opened", viewed: false },
      { id: "fresh", viewed: false },
    ];
    expect(markStoriesViewed(items, ["opened"])).toEqual([
      { id: "opened", viewed: true },
      { id: "fresh", viewed: false },
    ]);
  });
});

describe("liftUnseenStories", () => {
  it("поднимает непросмотренные, не меняя порядок внутри части", () => {
    const items = [
      { id: "city", viewed: false },
      { id: "seen", viewed: false },
      { id: "other", viewed: false },
    ];
    expect(liftUnseenStories(items, ["seen"]).map((item) => item.id)).toEqual(["city", "other", "seen"]);
  });
});

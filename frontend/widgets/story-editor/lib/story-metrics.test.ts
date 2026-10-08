import { describe, expect, it } from "vitest";
import { buildAuthorStoryMetrics } from "./story-metrics";

describe("buildAuthorStoryMetrics", () => {
  it("ставит показ на всю ширину, затем две пары счётчиков", () => {
    expect(
      buildAuthorStoryMetrics({
        liveCount: 5,
        followerCount: 5,
        unfollowCount: 5,
        replyCount: 5,
        savedCount: 5,
      }),
    ).toEqual([
      { id: "live", label: "Мои истории", value: "5", wide: true },
      { label: "Подписались", value: "5" },
      { label: "Отписались", value: "5" },
      { label: "Ответы", value: "5" },
      { id: "saved", label: "Сохраненные истории", value: "5" },
    ]);
  });
});

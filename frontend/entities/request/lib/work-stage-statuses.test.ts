import { describe, expect, it } from "vitest";
import { SYSTEM_WORK_STAGE_STATUSES, mergeWorkStageStatusOptions } from "./work-stage-statuses";

describe("mergeWorkStageStatusOptions", () => {
  it("puts system statuses first and appends custom", () => {
    const merged = mergeWorkStageStatusOptions([{ key: "custom_1", label: "Мой" }]);
    expect(merged[0]?.key).toBe(SYSTEM_WORK_STAGE_STATUSES[0]?.key);
    expect(merged.some((item) => item.key === "custom_1")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildRequestFlowSteps,
  getRequestFlowActiveStepId,
} from "./request-status-flow";

describe("request status flow stepper", () => {
  it("stepper has no PROVIDER_SELECTED step", () => {
    const steps = buildRequestFlowSteps({
      status: "DISCUSSING",
      lockedAt: "2026-08-06T00:00:00.000Z",
    });
    expect(steps.map((s) => s.id)).toEqual([
      "NEW",
      "DISCUSSING",
      "CONTRACT",
      "WORK",
      "ACCEPTANCE",
      "COMPLETED",
    ]);
    expect(
      getRequestFlowActiveStepId({
        status: "DISCUSSING",
        lockedAt: "2026-08-06T00:00:00.000Z",
      }),
    ).toBe("CONTRACT");
  });

  it("discussing without lock stays on DISCUSSING", () => {
    expect(
      getRequestFlowActiveStepId({ status: "DISCUSSING", lockedAt: null }),
    ).toBe("DISCUSSING");
  });
});

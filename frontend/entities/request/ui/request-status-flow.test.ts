import { describe, expect, it } from "vitest";
import {
  buildRequestFlowSteps,
  getRequestDisplayStatusLabel,
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
    ).toBe("DISCUSSING");
  });

  it("discussing without lock stays on DISCUSSING", () => {
    expect(
      getRequestFlowActiveStepId({ status: "DISCUSSING", lockedAt: null }),
    ).toBe("DISCUSSING");
  });

  it("SERVICE lock does not skip NEW or DISCUSSING", () => {
    const lockedAt = "2026-08-06T00:00:00.000Z";
    expect(getRequestFlowActiveStepId({ status: "NEW", lockedAt })).toBe("NEW");
    expect(buildRequestFlowSteps({ status: "NEW", lockedAt })[1].completed).toBe(false);
    expect(getRequestFlowActiveStepId({ status: "DISCUSSING", lockedAt })).toBe("DISCUSSING");
  });

  it("agreed terms advance the visible stage to contract", () => {
    const input = { status: "TERMS_AGREED" as const, lockedAt: "2026-08-06T00:00:00.000Z" };
    expect(getRequestFlowActiveStepId(input)).toBe("CONTRACT");
    expect(getRequestDisplayStatusLabel(input)).toBe("Договор");
    expect(buildRequestFlowSteps(input).slice(0, 2).every((step) => step.completed)).toBe(true);
  });

  it.each(["NEW", "DISCUSSING"] as const)("agreed price advances a selected %s request to contract", (status) => {
    const input = {
      status,
      lockedAt: "2026-08-06T00:00:00.000Z",
      totalAmountRubles: 12000,
    };
    expect(getRequestFlowActiveStepId(input)).toBe("CONTRACT");
    expect(buildRequestFlowSteps(input)[1].completed).toBe(true);
  });

  it("agreed preliminary terms without a selected provider stay in discussion", () => {
    const input = { status: "TERMS_AGREED" as const, lockedAt: null };
    expect(getRequestFlowActiveStepId(input)).toBe("DISCUSSING");
    expect(getRequestDisplayStatusLabel(input)).toBe("Условия согласованы");
  });
});

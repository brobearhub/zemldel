import { describe, expect, it } from "vitest";
import { hasRequestLock, isContractPhase, isOrderExecutionStatus } from "./request.dto";

describe("request lock (frontend)", () => {
  it("contract phase when locked and not execution", () => {
    expect(isContractPhase({ status: "DISCUSSING", lockedAt: "2026-08-06T00:00:00.000Z" })).toBe(true);
    expect(isContractPhase({ status: "DISCUSSING", lockedAt: null })).toBe(false);
    expect(isContractPhase({ status: "ACTIVE", lockedAt: "2026-08-06T00:00:00.000Z" })).toBe(false);
  });

  it("hasRequestLock", () => {
    expect(hasRequestLock({ lockedAt: null })).toBe(false);
    expect(hasRequestLock({ lockedAt: "2026-08-06T00:00:00.000Z" })).toBe(true);
  });

  it("no legacy order statuses", () => {
    expect(isOrderExecutionStatus("CONTRACT_ACCEPTED" as never)).toBe(false);
  });
});

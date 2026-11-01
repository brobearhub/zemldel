import { describe, expect, it } from "vitest";
import { createExclusiveRequestGuard } from "./exclusive-request-guard";

describe("createExclusiveRequestGuard", () => {
  it("инвалидирует ответы запросов из предыдущего режима экрана", () => {
    const guard = createExclusiveRequestGuard();
    const dealRequest = guard.capture();

    expect(guard.isCurrent(dealRequest)).toBe(true);

    guard.invalidate();

    expect(guard.isCurrent(dealRequest)).toBe(false);
    expect(guard.isCurrent(guard.capture())).toBe(true);
  });
});

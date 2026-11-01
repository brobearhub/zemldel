import { describe, expect, it } from "vitest";
import { normalizeDeliverySummary } from "./delivery-submission-dialog-model";

describe("normalizeDeliverySummary", () => {
  it("не отправляет пустой итог после trim", () => {
    expect(normalizeDeliverySummary("   ")).toBeNull();
  });

  it("отправляет итог без начальных и конечных пробелов", () => {
    expect(normalizeDeliverySummary("  Исправлены замечания  ")).toBe(
      "Исправлены замечания",
    );
  });
});

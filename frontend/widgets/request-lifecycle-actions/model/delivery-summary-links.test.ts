import { describe, expect, it } from "vitest";
import { splitSafeSummaryLinks } from "./delivery-summary-links";

describe("splitSafeSummaryLinks", () => {
  it("выделяет только http/https ссылки", () => {
    expect(
      splitSafeSummaryLinks(
        "Материалы https://example.com/a и javascript:alert(1)",
      ),
    ).toEqual([
      { type: "text", value: "Материалы " },
      { type: "link", value: "https://example.com/a" },
      { type: "text", value: " и javascript:alert(1)" },
    ]);
  });
});

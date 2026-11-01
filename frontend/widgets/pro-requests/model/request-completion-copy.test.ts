import { describe, expect, it } from "vitest";
import { buildRequestCompletionDescription } from "./request-completion-copy";

describe("buildRequestCompletionDescription", () => {
  it("promises that a positive remainder can be marked later", () => {
    expect(buildRequestCompletionDescription(5000)).toContain(
      "Остаток 5 000 ₽ можно отметить оплаченным позднее.",
    );
    expect(buildRequestCompletionDescription(5000)).not.toContain(
      "отмечать оплаты по заявке будет нельзя",
    );
  });
});

import { describe, expect, it } from "vitest";
import { formatRubles, parseRublesInput, resolvePaymentTriggerLabel } from "./request-finance";

describe("request finance helpers", () => {
  it("formats whole rubles", () => {
    expect(formatRubles(25_000)).toMatch(/25[\s\u00a0]?000/);
    expect(formatRubles(25_000)).not.toMatch(/,/);
  });

  it("shows the set amount on the payment trigger", () => {
    expect(resolvePaymentTriggerLabel(1000)).toMatch(/1[\s\u00a0]?000/);
    expect(resolvePaymentTriggerLabel(1000)).toMatch(/₽/);
    expect(resolvePaymentTriggerLabel(null)).toBe("Оплата");
  });

  it("parses whole-ruble input", () => {
    expect(parseRublesInput("25000")).toBe(25_000);
    expect(parseRublesInput(" 1 000 ")).toBe(1_000);
    expect(parseRublesInput("12,5")).toBeNull();
    expect(parseRublesInput("0")).toBeNull();
    expect(parseRublesInput("")).toBeNull();
  });
});

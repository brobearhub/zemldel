import { describe, expect, it } from "vitest";
import { formatRubles, parseRublesInput } from "./request-finance";

describe("request finance helpers", () => {
  it("formats whole rubles", () => {
    expect(formatRubles(25_000)).toMatch(/25[\s\u00a0]?000/);
    expect(formatRubles(25_000)).not.toMatch(/,/);
  });

  it("parses whole-ruble input", () => {
    expect(parseRublesInput("25000")).toBe(25_000);
    expect(parseRublesInput(" 1 000 ")).toBe(1_000);
    expect(parseRublesInput("12,5")).toBeNull();
    expect(parseRublesInput("0")).toBeNull();
    expect(parseRublesInput("")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { formatKopecksRub, rublesInputToKopecks } from "./request-finance";

describe("request finance helpers", () => {
  it("formats kopecks as whole rubles", () => {
    expect(formatKopecksRub(2_500_000)).toMatch(/25[\s\u00a0]?000/);
    expect(formatKopecksRub(2_500_000)).not.toMatch(/,/);
  });

  it("parses ruble input to kopecks", () => {
    expect(rublesInputToKopecks("25000")).toBe(2_500_000);
    expect(rublesInputToKopecks("12,5")).toBe(1_250);
    expect(rublesInputToKopecks(" 1 000 ")).toBe(100_000);
    expect(rublesInputToKopecks("0")).toBeNull();
    expect(rublesInputToKopecks("")).toBeNull();
  });
});

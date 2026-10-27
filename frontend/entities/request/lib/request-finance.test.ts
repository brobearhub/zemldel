import { describe, expect, it } from "vitest";
import { formatRubles, parseRublesInput, resolvePaymentTriggerLabel, resolveRequestPriceView } from "./request-finance";

describe("request finance helpers", () => {
  it("formats whole rubles", () => {
    expect(formatRubles(25_000)).toMatch(/25[\s\u00a0]?000/);
    expect(formatRubles(25_000)).not.toMatch(/,/);
  });

  it("keeps the panel name and puts the amount in a separate caption", () => {
    expect(resolvePaymentTriggerLabel(1000)).toBe("Цена и оплата");
    expect(resolvePaymentTriggerLabel(null)).toBe("Цена и оплата");
    expect(resolveRequestPriceView({ totalAmountRubles: null, servicePriceRubles: null }).triggerCaption).toBe(
      "Цена не указана",
    );
    expect(resolveRequestPriceView({ totalAmountRubles: null, servicePriceRubles: 12000 }).triggerCaption).toMatch(
      /Цена по услуге/,
    );
    expect(resolveRequestPriceView({ totalAmountRubles: 15000, servicePriceRubles: 12000 }).triggerCaption).toMatch(/15/);
    expect(resolveRequestPriceView({ totalAmountRubles: 15000, servicePriceRubles: 12000 }).changedNote).toMatch(
      /Изменена относительно услуги/,
    );
  });

  it("parses whole-ruble input", () => {
    expect(parseRublesInput("25000")).toBe(25_000);
    expect(parseRublesInput(" 1 000 ")).toBe(1_000);
    expect(parseRublesInput("12,5")).toBeNull();
    expect(parseRublesInput("0")).toBeNull();
    expect(parseRublesInput("")).toBeNull();
  });
});

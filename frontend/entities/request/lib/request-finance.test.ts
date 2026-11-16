import { describe, expect, it } from "vitest";
import {
  formatRubles,
  parseRublesInput,
  resolvePaymentTriggerLabel,
  resolveRequestFinanceSummary,
  resolveRequestPriceView,
} from "./request-finance";

describe("request finance helpers", () => {
  it("formats whole rubles", () => {
    expect(formatRubles(25_000)).toMatch(/25[\s\u00a0]?000/);
    expect(formatRubles(25_000)).not.toMatch(/,/);
  });

  it("uses the request total as the payment trigger label", () => {
    const payments = [
      { type: "OTHER" as const, amountRubles: 8100, paidAt: null },
      { type: "CONTRACT" as const, amountRubles: 6000, paidAt: null },
    ];
    expect(resolvePaymentTriggerLabel({
      totalAmountRubles: 12000,
      paidAmountRubles: 0,
      payments,
    })).toBe(formatRubles(20100));
    expect(resolvePaymentTriggerLabel({
      totalAmountRubles: null,
      paidAmountRubles: 0,
      payments,
    })).toBe("Сумма");
    expect(resolvePaymentTriggerLabel({
      totalAmountRubles: 0,
      paidAmountRubles: 0,
      payments: [],
    })).toBe(formatRubles(0));
  });

  it("shows the set work price without treating an old proposal as the current price", () => {
    expect(
      resolveRequestPriceView({
        totalAmountRubles: null,
        servicePriceRubles: null,
        priceProposal: null,
      }).triggerCaption,
    ).toBe("Цена работ не указана");
    expect(
      resolveRequestPriceView({
        totalAmountRubles: null,
        servicePriceRubles: 12000,
        priceProposal: null,
      }),
    ).toMatchObject({
      triggerCaption: "Цена работ не указана",
      servicePriceLabel: expect.stringMatching(/Справочная цена услуги/),
      proposedAmount: null,
      agreedAmount: null,
    });
    expect(
      resolveRequestPriceView({
        totalAmountRubles: null,
        servicePriceRubles: 12000,
        priceProposal: {
          id: "pp1",
          amountRubles: 15000,
          authorSide: "PROVIDER",
        },
      }),
    ).toMatchObject({
      headline: "Цена работ не указана",
      proposedAmount: null,
      agreedAmount: null,
    });
    expect(
      resolveRequestPriceView({
        totalAmountRubles: 15000,
        servicePriceRubles: 12000,
        priceProposal: null,
      }),
    ).toMatchObject({
      headline: expect.stringMatching(/Цена работ:.*15/),
      proposedAmount: null,
      agreedAmount: 15000,
    });
  });

  it("parses whole-ruble input", () => {
    expect(parseRublesInput("25000")).toBe(25_000);
    expect(parseRublesInput(" 1 000 ")).toBe(1_000);
    expect(parseRublesInput("12,5")).toBeNull();
    expect(parseRublesInput("0")).toBeNull();
    expect(parseRublesInput("")).toBeNull();
  });
});

describe("request total including expenses", () => {
  const payments = [
    { type: "OTHER" as const, amountRubles: 3000, paidAt: null },
    { type: "OTHER" as const, amountRubles: 2100, paidAt: null },
    { type: "OTHER" as const, amountRubles: 3000, paidAt: null },
    { type: "CONTRACT" as const, amountRubles: 6000, paidAt: null },
  ];

  it("includes every expense once without adding planned contract payments to the cost", () => {
    expect(
      resolveRequestFinanceSummary({
        totalAmountRubles: 12000,
        paidAmountRubles: 0,
        payments,
      }),
    ).toMatchObject({
      totalAmountRubles: 20100,
      paidAmountRubles: 0,
      remainingAmountRubles: 20100,
      remainingWorkAmountRubles: 12000,
      expensesAmountRubles: 8100,
    });
  });

  it("subtracts confirmed payments in both categories", () => {
    expect(
      resolveRequestFinanceSummary({
        totalAmountRubles: 12000,
        paidAmountRubles: 6000,
        payments: payments.map((payment, i) =>
          i === 0 ? { ...payment, paidAt: "2026-11-15" } : payment,
        ),
      }),
    ).toMatchObject({
      totalAmountRubles: 20100,
      paidAmountRubles: 9000,
      remainingAmountRubles: 11100,
      remainingWorkAmountRubles: 6000,
      remainingExpensesAmountRubles: 5100,
    });
  });

  it("does not invent a total before work price agreement", () => {
    expect(
      resolveRequestFinanceSummary({
        totalAmountRubles: null,
        paidAmountRubles: 0,
        payments,
      }),
    ).toMatchObject({
      totalAmountRubles: null,
      remainingAmountRubles: null,
      remainingWorkAmountRubles: null,
      expensesAmountRubles: 8100,
    });
  });

  it("keeps overpayment for work separate from unpaid expenses", () => {
    expect(
      resolveRequestFinanceSummary({
        totalAmountRubles: 12000,
        paidAmountRubles: 15000,
        payments,
      }),
    ).toMatchObject({
      totalAmountRubles: 20100,
      paidAmountRubles: 15000,
      remainingAmountRubles: 8100,
      remainingWorkAmountRubles: 0,
      overpaidWorkAmountRubles: 3000,
    });
  });

});

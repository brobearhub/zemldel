import { describe, it, expect } from "vitest";
import { emptyLandDraft, landPrice, landPriceCaption } from "./types";
import { chatHref, chatStatus } from "@/widgets/chats/model/inbox-format";
describe("land price and navigation", () => {
  it("shows the fraction, never a share price per sotka", () => {
    const row = { ...emptyLandDraft(), dealType: "SHARE" as const, areaM2: 1200, priceRubles: 1000000, details: { shareNumerator: 1, shareDenominator: 2 } };
    expect(landPriceCaption(row)).toBe("Цена за 1/2 доли в праве");
    expect(landPriceCaption(row)).not.toContain("сот");
  });
  it("keeps the one-time fee and rent separate, including a zero assignment fee", () => {
    const row = { ...emptyLandDraft(), dealType: "LEASE_ASSIGNMENT" as const, priceRubles: 0, details: { rentRubles: 3000, rentPeriod: "MONTH" } };
    expect(landPrice(row)).toBe("0 ₽"); expect(landPriceCaption(row)).toMatch(/3.*000 ₽ \/ месяц аренда/);
  });
  it("links land conversations to the shared messenger, without inventing a request", () => {
    const row = { kind: "LAND" as const, conversationId: "c1", landListingId: "l1", serviceRequestId: null, title: "Участок", lastMessageAt: null, lastSnippet: null };
    expect(chatHref(row, "customer")).toBe("/profile/chats/direct/c1"); expect(chatHref(row, "provider")).toBe("/pro/chats/direct/c1"); expect(chatStatus(row)).toBe("Участок");
  });
});

import { describe, expect, it } from "vitest";
import { shouldShowProviderPaymentPanel } from "./request-payment-panel-visibility";

describe("shouldShowProviderPaymentPanel", () => {
  it.each([
    { canProposePrice: true, canAcceptPrice: false },
    { canProposePrice: false, canAcceptPrice: true },
  ])("shows price panel for locked provider with server price action %#", (actions) => {
    expect(
      shouldShowProviderPaymentPanel({
        isLocked: true,
        ...actions,
      }),
    ).toBe(true);
  });

  it("keeps the panel hidden from a locked provider without server price actions", () => {
    expect(
      shouldShowProviderPaymentPanel({
        isLocked: true,
        canProposePrice: false,
        canAcceptPrice: false,
      }),
    ).toBe(false);
  });
});

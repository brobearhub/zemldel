import { describe, expect, it } from "vitest";
import { resolveRequestPaymentPermissions } from "./request-payment-permissions";

describe("resolveRequestPaymentPermissions", () => {
  it("allows the selected provider to propose and accept price from server-derived flags", () => {
    expect(
      resolveRequestPaymentPermissions({
        status: "DISCUSSING",
        mode: "provider",
        isLocked: true,
        canProposePrice: true,
        canAcceptPrice: true,
      }),
    ).toMatchObject({
      canProposePrice: true,
      canAcceptPrice: true,
      canEditPayments: false,
    });
  });
});

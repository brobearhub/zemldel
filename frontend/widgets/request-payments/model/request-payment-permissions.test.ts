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
      canEditPrice: true,
      canAddPayment: false,
      canMarkPaid: false,
      canProposePrice: true,
      canAcceptPrice: true,
      canEditPayments: false,
    });
  });

  it("keeps late payment actions in COMPLETED while disabling price actions", () => {
    expect(
      resolveRequestPaymentPermissions({
        status: "COMPLETED",
        mode: "provider",
        isLocked: false,
        canProposePrice: true,
        canAcceptPrice: true,
      }),
    ).toMatchObject({
      canEditPrice: false,
      canAddPayment: true,
      canMarkPaid: true,
      canProposePrice: false,
      canAcceptPrice: false,
    });
  });

  it.each(["CANCELLED", "CLOSED"] as const)("disables all financial actions in %s", (status) => {
    expect(
      resolveRequestPaymentPermissions({
        status,
        mode: "customer",
        isLocked: false,
        canProposePrice: true,
        canAcceptPrice: true,
      }),
    ).toMatchObject({
      canEditPrice: false,
      canAddPayment: false,
      canMarkPaid: false,
    });
  });
});

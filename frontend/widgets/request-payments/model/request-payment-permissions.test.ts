import { describe, expect, it } from "vitest";
import { resolveRequestPaymentPermissions } from "./request-payment-permissions";

describe("resolveRequestPaymentPermissions", () => {
  it("denies customer price changes even when a stale server flag allows them", () => {
    expect(
      resolveRequestPaymentPermissions({
        status: "DISCUSSING",
        mode: "customer",
        isLocked: false,
        canProposePrice: true,
      }),
    ).toMatchObject({
      canEditPrice: false,
      canAddPayment: true,
      canMarkPaid: true,
    });
  });

  it("allows price changes for the provider with server permission", () => {
    expect(
      resolveRequestPaymentPermissions({
        status: "DISCUSSING",
        mode: "provider",
        isLocked: false,
        canProposePrice: true,
      }),
    ).toMatchObject({
      canEditPrice: true,
      canAddPayment: true,
      canMarkPaid: true,
    });
  });

  it("honors the provider price permission and locked payment state", () => {
    expect(
      resolveRequestPaymentPermissions({
        status: "DISCUSSING",
        mode: "provider",
        isLocked: true,
        canProposePrice: false,
      }),
    ).toMatchObject({
      canEditPrice: false,
      canAddPayment: false,
      canMarkPaid: false,
    });
  });

  it("keeps late payment actions in COMPLETED while disabling price actions", () => {
    expect(
      resolveRequestPaymentPermissions({
        status: "COMPLETED",
        mode: "provider",
        isLocked: false,
        canProposePrice: true,
      }),
    ).toMatchObject({
      canEditPrice: false,
      canAddPayment: true,
      canMarkPaid: true,
    });
  });

  it.each(["CANCELLED", "CLOSED"] as const)(
    "disables all financial actions in %s",
    (status) => {
      expect(
        resolveRequestPaymentPermissions({
          status,
          mode: "customer",
          isLocked: false,
          canProposePrice: true,
        }),
      ).toMatchObject({
        canEditPrice: false,
        canAddPayment: false,
        canMarkPaid: false,
      });
    },
  );
});

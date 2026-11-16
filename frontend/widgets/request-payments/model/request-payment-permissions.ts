import type { RequestStatus } from "@/entities/request";

const PRICE_BLOCKED_STATUSES: readonly RequestStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
];
const PAYMENT_BLOCKED_STATUSES: readonly RequestStatus[] = [
  "CANCELLED",
  "CLOSED",
];

export type RequestPaymentPermissions = {
  canEditPrice: boolean;
  canAddPayment: boolean;
  canMarkPaid: boolean;
  canEditPayments: boolean;
};

export function resolveRequestPaymentPermissions(input: {
  status: RequestStatus;
  mode: "customer" | "provider";
  isLocked: boolean;
  canProposePrice: boolean;
}): RequestPaymentPermissions {
  const canEditPrice =
    !PRICE_BLOCKED_STATUSES.includes(input.status) &&
    input.mode === "provider" &&
    input.canProposePrice;
  const canAddPayment =
    !PAYMENT_BLOCKED_STATUSES.includes(input.status) &&
    (input.mode === "customer" || !input.isLocked);
  const canMarkPaid = canAddPayment;
  return {
    canEditPrice,
    canAddPayment,
    canMarkPaid,
    canEditPayments: canAddPayment,
  };
}

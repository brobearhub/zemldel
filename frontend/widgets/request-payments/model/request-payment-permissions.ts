import type { RequestStatus } from "@/entities/request";

const CLOSED_STATUSES: readonly RequestStatus[] = ["COMPLETED", "CANCELLED", "CLOSED"];

export function resolveRequestPaymentPermissions(input: {
  status: RequestStatus;
  mode: "customer" | "provider";
  isLocked: boolean;
  canProposePrice: boolean;
  canAcceptPrice: boolean;
}) {
  const canEditPayments =
    !CLOSED_STATUSES.includes(input.status) && (input.mode === "customer" || !input.isLocked);
  return {
    canEditPayments,
    canProposePrice:
      !CLOSED_STATUSES.includes(input.status) && input.canProposePrice,
    canAcceptPrice:
      !CLOSED_STATUSES.includes(input.status) && input.canAcceptPrice,
  };
}

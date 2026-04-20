import { buildOrderStatusFlowSteps, getOrderFlowActiveStepId, type StatusProgressStep } from "@/entities/order";
import type { OrderStatus } from "@/entities/order/dto/order.dto";
import { getServiceRequestStatusLabel, isServiceRequestOrderStatus, type ServiceRequestStatus } from "@/entities/service-request/dto/service-request.dto";

export type ServiceRequestFlowOfferState = {
  status: "SELECTED" | "DECLINED" | null;
};

export function buildServiceRequestFlowSteps(
  status: ServiceRequestStatus,
  offer?: ServiceRequestFlowOfferState | null
): StatusProgressStep[] {
  if (status === "CLOSED") {
    return [{ id: "CLOSED", label: "Заявка закрыта", completed: false }];
  }

  if (status === "CANCELLED") {
    return [{ id: "CANCELLED", label: "Заказ отменен", completed: false }];
  }

  const steps: StatusProgressStep[] = [
    { id: "NEW", label: getServiceRequestStatusLabel("NEW"), completed: status !== "NEW" },
    {
      id: "DISCUSSING",
      label: getServiceRequestStatusLabel("DISCUSSING"),
      completed: status !== "NEW" && status !== "DISCUSSING",
    },
    {
      id: "TERMS_AGREED",
      label: getServiceRequestStatusLabel("TERMS_AGREED"),
      completed: status !== "NEW" && status !== "DISCUSSING" && status !== "TERMS_AGREED",
    },
    {
      id: "PROVIDER_SELECTED",
      label: getServiceRequestStatusLabel("PROVIDER_SELECTED"),
      completed:
        status !== "NEW" &&
        status !== "DISCUSSING" &&
        status !== "TERMS_AGREED" &&
        status !== "PROVIDER_SELECTED",
    },
  ];

  const orderSteps = buildOrderStatusFlowSteps(
    (isServiceRequestOrderStatus(status) ? (status as OrderStatus) : "ACTIVE") satisfies OrderStatus
  ).map((step) => ({
    ...step,
    completed: isServiceRequestOrderStatus(status) ? step.completed : false,
  }));

  steps.push(...orderSteps);

  return steps;
}

export function getServiceRequestFlowActiveStepId(
  status: ServiceRequestStatus,
  offer?: ServiceRequestFlowOfferState | null
) {
  if (status === "CLOSED" || status === "CANCELLED") {
    return status;
  }

  if (isServiceRequestOrderStatus(status)) {
    return getOrderFlowActiveStepId(status as OrderStatus);
  }

  return status;
}

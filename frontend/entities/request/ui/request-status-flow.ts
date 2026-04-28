import type { RequestCustomerDto, RequestStatus } from "../dto/request.dto";
import { getRequestStatusLabel, isOrderExecutionStatus } from "../dto/request.dto";

export type RequestStatusFilter = "ALL" | RequestStatus;

export type StatusProgressStep = {
  id: string;
  label: string;
  completed: boolean;
};

type CustomerRequestStepperInput = Pick<RequestCustomerDto, "status" | "dealTerms">;

const ORDER_STATUS_STEPPER_FLOW = ["CONTRACT", "ESCROW", "WORK", "ACCEPTANCE", "PAYOUT", "COMPLETED"] as const;
type OrderStepperStepId = (typeof ORDER_STATUS_STEPPER_FLOW)[number];

export function isOpenRequestStatus(status: RequestStatus) {
  return status !== "COMPLETED" && status !== "CANCELLED" && status !== "CLOSED";
}

export function getRequestStatusColor(status: RequestStatus): "default" | "info" | "success" | "warning" {
  if (status === "PAYMENT_PENDING" || status === "SERVICE_RENDERED" || status === "ACCEPTANCE_PENDING") return "warning";
  if (status === "PAYMENT_PROCESSING" || status === "CONTRACT_ACCEPTED" || status === "DISCUSSING" || status === "TERMS_AGREED" || status === "PROVIDER_SELECTED") return "info";
  if (status === "ACCEPTED" || status === "PAID" || status === "COMPLETED") return "success";
  if (status === "CANCELLED" || status === "CLOSED") return "default";
  return "info";
}

export function getRequestCardAccentColor(status: RequestStatus) {
  if (status === "PAYMENT_PENDING" || status === "SERVICE_RENDERED" || status === "ACCEPTANCE_PENDING") return "warning.main";
  if (status === "PAYMENT_PROCESSING" || status === "CONTRACT_ACCEPTED") return "info.main";
  if (status === "ACCEPTED" || status === "PAID") return "success.main";
  if (status === "COMPLETED") return "success.main";
  if (status === "CANCELLED" || status === "CLOSED") return "text.disabled";
  return "info.main";
}

export function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getOrderFlowActiveStepId(status: RequestStatus): OrderStepperStepId | string {
  if (status === "CONTRACT_ACCEPTED") return "CONTRACT";
  if (status === "PAYMENT_PENDING" || status === "PAYMENT_PROCESSING") return "ESCROW";
  if (status === "ACTIVE" || status === "SERVICE_RENDERED") return "WORK";
  if (status === "ACCEPTANCE_PENDING" || status === "ACCEPTED") return "ACCEPTANCE";
  if (status === "PAID") return "PAYOUT";
  if (status === "COMPLETED") return "COMPLETED";
  return status;
}

function getEscrowStepLabel(status: RequestStatus) {
  if (status === "PAYMENT_PROCESSING" || status === "ACTIVE" || status === "SERVICE_RENDERED" || status === "ACCEPTANCE_PENDING" || status === "ACCEPTED" || status === "PAID" || status === "COMPLETED") {
    return "Средства зарезервированы";
  }
  return status === "PAYMENT_PENDING" ? "Ожидает оплаты" : "Эскроу";
}

function buildOrderPhaseSteps(status: RequestStatus): StatusProgressStep[] {
  if (status === "CANCELLED") {
    return [{ id: "cancelled", label: "Отменен", completed: false }];
  }
  const activeStepId = getOrderFlowActiveStepId(status);
  const activeIndex = Math.max(ORDER_STATUS_STEPPER_FLOW.findIndex((s) => s === activeStepId), 0);
  return ORDER_STATUS_STEPPER_FLOW.map((step, index) => ({
    id: step,
    label:
      step === "CONTRACT"
        ? "Договор"
        : step === "ESCROW"
          ? getEscrowStepLabel(status)
          : step === "WORK"
            ? status === "SERVICE_RENDERED" ? "Услуга оказана" : "В работе"
            : step === "ACCEPTANCE"
              ? status === "ACCEPTANCE_PENDING" ? "Ожидает принятия" : status === "ACCEPTED" || status === "PAID" || status === "COMPLETED" ? "Принято" : "Принятие"
              : step === "PAYOUT"
                ? "Выплата исполнителю"
                : "Завершен",
    completed: activeIndex > index,
  }));
}

export function getRequestFlowActiveStepId(status: RequestStatus) {
  if (status === "CLOSED" || status === "CANCELLED") return status;
  if (status === "PROVIDER_SELECTED") return "CONTRACT";
  if (isOrderExecutionStatus(status)) return getOrderFlowActiveStepId(status);
  return status;
}

export function getCustomerRequestFlowActiveStepId(req: CustomerRequestStepperInput) {
  if (req.status === "CLOSED" || req.status === "CANCELLED") return req.status;
  if (req.status === "PROVIDER_SELECTED") return "CONTRACT";
  if (req.status === "TERMS_AGREED") return "DISCUSSING";
  if (isOrderExecutionStatus(req.status)) return getOrderFlowActiveStepId(req.status);
  return req.status;
}

export function buildRequestFlowSteps(status: RequestStatus): StatusProgressStep[] {
  if (status === "CLOSED") {
    return [{ id: "CLOSED", label: "Заявка закрыта", completed: false }];
  }
  if (status === "CANCELLED") {
    return [{ id: "CANCELLED", label: "Заказ отменен", completed: false }];
  }

  const preOrderSteps: StatusProgressStep[] = [
    { id: "NEW", label: getRequestStatusLabel("NEW"), completed: status !== "NEW" },
    {
      id: "DISCUSSING",
      label: getRequestStatusLabel("DISCUSSING"),
      completed: status !== "NEW" && status !== "DISCUSSING" && status !== "TERMS_AGREED",
    },
    {
      id: "PROVIDER_SELECTED",
      label: getRequestStatusLabel("PROVIDER_SELECTED"),
      completed: status !== "NEW" && status !== "DISCUSSING" && status !== "TERMS_AGREED",
    },
  ];

  const orderPhaseSteps = buildOrderPhaseSteps(
    isOrderExecutionStatus(status) ? status : "ACTIVE"
  ).map((step) => ({
    ...step,
    completed: isOrderExecutionStatus(status) ? step.completed : false,
  }));

  return [...preOrderSteps, ...orderPhaseSteps];
}

export function buildCustomerRequestFlowSteps(req: CustomerRequestStepperInput): StatusProgressStep[] {
  const status = req.status;
  if (status === "CLOSED") {
    return [{ id: "CLOSED", label: "Заявка закрыта", completed: false }];
  }
  if (status === "CANCELLED") {
    return [{ id: "CANCELLED", label: "Заказ отменен", completed: false }];
  }

  type PreOrderStepId = "NEW" | "DISCUSSING" | "PROVIDER_SELECTED";
  const preOrderIds: PreOrderStepId[] = ["NEW", "DISCUSSING", "PROVIDER_SELECTED"];

  const preOrderIndex =
    isOrderExecutionStatus(status)
      ? preOrderIds.length
      : status === "PROVIDER_SELECTED"
        ? preOrderIds.length
        : status === "TERMS_AGREED" || status === "DISCUSSING"
          ? preOrderIds.indexOf("DISCUSSING")
          : preOrderIds.indexOf("NEW");

  const preOrderSteps: StatusProgressStep[] = preOrderIds.map((id) => ({
    id,
    label: getRequestStatusLabel(id),
    completed: isOrderExecutionStatus(status) ? true : preOrderIds.indexOf(id) < preOrderIndex,
  }));

  const orderPhaseSteps = buildOrderPhaseSteps(
    isOrderExecutionStatus(status) ? status : "ACTIVE"
  ).map((step) => ({
    ...step,
    completed: isOrderExecutionStatus(status) ? step.completed : false,
  }));

  return [...preOrderSteps, ...orderPhaseSteps];
}

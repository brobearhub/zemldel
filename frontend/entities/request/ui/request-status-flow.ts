import type { RequestCustomerDto, RequestStatus } from "../dto/request.dto";
import { getRequestStatusLabel, isContractPhase, isOrderExecutionStatus } from "../dto/request.dto";

export type RequestStatusFilter = "ALL" | RequestStatus;

export type StatusProgressStep = {
  id: string;
  label: string;
  completed: boolean;
};

export type RequestFlowStepperInput = {
  status: RequestStatus;
  lockedAt: string | null;
};

type CustomerRequestStepperInput = Pick<RequestCustomerDto, "status" | "dealTerms" | "lockedAt">;

const ORDER_STATUS_STEPPER_FLOW = ["CONTRACT", "WORK", "ACCEPTANCE", "COMPLETED"] as const;
type OrderStepperStepId = (typeof ORDER_STATUS_STEPPER_FLOW)[number];

export function isOpenRequestStatus(status: RequestStatus) {
  return status !== "COMPLETED" && status !== "CANCELLED" && status !== "CLOSED";
}

/** Блок «Документы» сворачиваем с фазы работ и далее (включая приёмку и терминальные). */
export function shouldCollapseDocumentsByDefault(status: RequestStatus) {
  return (
    status === "ACTIVE" ||
    status === "ACCEPTANCE_PENDING" ||
    status === "ACCEPTED" ||
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "CLOSED"
  );
}

export function getRequestStatusColor(status: RequestStatus): "default" | "info" | "success" | "warning" {
  if (status === "ACCEPTANCE_PENDING") return "warning";
  if (status === "ACTIVE" || status === "DISCUSSING" || status === "TERMS_AGREED") return "info";
  if (status === "ACCEPTED" || status === "COMPLETED") return "success";
  if (status === "CANCELLED" || status === "CLOSED") return "default";
  return "info";
}

export function getRequestCardAccentColor(status: RequestStatus) {
  if (status === "ACCEPTANCE_PENDING") return "warning.main";
  if (status === "ACTIVE") return "info.main";
  if (status === "ACCEPTED") return "success.main";
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
  if (status === "ACTIVE") return "WORK";
  if (status === "ACCEPTANCE_PENDING" || status === "ACCEPTED") return "ACCEPTANCE";
  if (status === "COMPLETED") return "COMPLETED";
  return status;
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
        : step === "WORK"
          ? "В работе"
          : step === "ACCEPTANCE"
            ? status === "ACCEPTANCE_PENDING"
              ? "Ожидает принятия"
              : status === "ACCEPTED" || status === "COMPLETED"
                ? "Принято"
                : "Принятие"
            : "Завершен",
    completed: activeIndex > index,
  }));
}

export function getRequestFlowActiveStepId(input: RequestFlowStepperInput) {
  const { status } = input;
  if (status === "CLOSED" || status === "CANCELLED") return status;
  if (isContractPhase(input)) return "CONTRACT";
  if (isOrderExecutionStatus(status)) return getOrderFlowActiveStepId(status);
  return status === "TERMS_AGREED" ? "DISCUSSING" : status;
}

export function getCustomerRequestFlowActiveStepId(req: CustomerRequestStepperInput) {
  return getRequestFlowActiveStepId(req);
}

export function buildRequestFlowSteps(input: RequestFlowStepperInput): StatusProgressStep[] {
  const { status } = input;
  if (status === "CLOSED") {
    return [{ id: "CLOSED", label: "Заявка закрыта", completed: false }];
  }
  if (status === "CANCELLED") {
    return [{ id: "CANCELLED", label: "Заказ отменен", completed: false }];
  }

  type PreOrderStepId = "NEW" | "DISCUSSING";
  const preOrderIds: PreOrderStepId[] = ["NEW", "DISCUSSING"];

  const preOrderIndex =
    isOrderExecutionStatus(status) || isContractPhase(input)
      ? preOrderIds.length
      : status === "TERMS_AGREED" || status === "DISCUSSING"
        ? preOrderIds.indexOf("DISCUSSING")
        : preOrderIds.indexOf("NEW");

  const preOrderSteps: StatusProgressStep[] = preOrderIds.map((id) => ({
    id,
    label: getRequestStatusLabel(id),
    completed: isOrderExecutionStatus(status) || isContractPhase(input)
      ? true
      : preOrderIds.indexOf(id) < preOrderIndex,
  }));

  const orderPhaseSteps = buildOrderPhaseSteps(
    isOrderExecutionStatus(status) ? status : "ACTIVE"
  ).map((step) => ({
    ...step,
    completed: isOrderExecutionStatus(status)
      ? step.completed
      : isContractPhase(input)
        ? step.id === "CONTRACT"
          ? false
          : false
        : false,
  }));

  // When in contract phase, CONTRACT is active (not completed); later order steps incomplete.
  if (isContractPhase(input)) {
    return [
      ...preOrderSteps,
      ...ORDER_STATUS_STEPPER_FLOW.map((step) => ({
        id: step,
        label:
          step === "CONTRACT"
            ? "Договор"
            : step === "WORK"
              ? "В работе"
              : step === "ACCEPTANCE"
                ? "Принятие"
                : "Завершен",
        completed: false,
      })),
    ];
  }

  return [...preOrderSteps, ...orderPhaseSteps];
}

export function buildCustomerRequestFlowSteps(req: CustomerRequestStepperInput): StatusProgressStep[] {
  return buildRequestFlowSteps(req);
}

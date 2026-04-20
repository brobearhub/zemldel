import type { OrderStatus } from "../dto/order.dto";

export type OrderStatusFilter = "ALL" | OrderStatus;

export const ORDER_STATUS_FLOW = [
  "CONTRACT_ACCEPTED",
  "PAYMENT_PENDING",
  "PAYMENT_PROCESSING",
  "ACTIVE",
  "SERVICE_RENDERED",
  "ACCEPTANCE_PENDING",
  "ACCEPTED",
  "PAID",
  "COMPLETED",
] as const satisfies readonly OrderStatus[];

const ORDER_STATUS_STEPPER_FLOW = ["CONTRACT", "ESCROW", "WORK", "ACCEPTANCE", "PAYOUT", "COMPLETED"] as const;
type OrderStepperStepId = (typeof ORDER_STATUS_STEPPER_FLOW)[number];

export function isOpenOrderStatus(status: OrderStatus) {
  return status !== "COMPLETED" && status !== "CANCELLED";
}

export function getOrderStatusLabel(status: OrderStatus) {
  if (status === "CONTRACT_ACCEPTED") return "Договор заключен";
  if (status === "PAYMENT_PENDING") return "Ожидает оплаты";
  if (status === "PAYMENT_PROCESSING") return "Средства зарезервированы";
  if (status === "SERVICE_RENDERED") return "Услуга оказана";
  if (status === "ACCEPTANCE_PENDING") return "Ожидает принятия";
  if (status === "ACCEPTED") return "Принято";
  if (status === "PAID") return "Выплата исполнителю";
  if (status === "COMPLETED") return "Завершен";
  if (status === "CANCELLED") return "Отменен";
  return "В работе";
}

function getEscrowStepLabel(status: OrderStatus) {
  if (status === "PAYMENT_PROCESSING" || status === "ACTIVE" || status === "SERVICE_RENDERED" || status === "ACCEPTANCE_PENDING" || status === "ACCEPTED" || status === "PAID" || status === "COMPLETED") {
    return "Средства зарезервированы";
  }
  return status === "PAYMENT_PENDING" ? "Ожидает оплаты" : "Эскроу";
}

function getWorkStepLabel(status: OrderStatus) {
  return status === "SERVICE_RENDERED" ? "Услуга оказана" : "В работе";
}

function getAcceptanceStepLabel(status: OrderStatus) {
  if (status === "ACCEPTANCE_PENDING") return "Ожидает принятия";
  if (status === "ACCEPTED" || status === "PAID" || status === "COMPLETED") return "Принято";
  return "Принятие";
}

function getPayoutStepLabel(status: OrderStatus) {
  if (status === "PAID" || status === "COMPLETED") return "Выплата исполнителю";
  return "Выплата исполнителю";
}

export function getOrderFlowActiveStepId(status: OrderStatus): OrderStepperStepId | OrderStatus {
  if (status === "CONTRACT_ACCEPTED") return "CONTRACT";
  if (status === "PAYMENT_PENDING" || status === "PAYMENT_PROCESSING") return "ESCROW";
  if (status === "ACTIVE" || status === "SERVICE_RENDERED") return "WORK";
  if (status === "ACCEPTANCE_PENDING" || status === "ACCEPTED") return "ACCEPTANCE";
  if (status === "PAID") return "PAYOUT";
  if (status === "COMPLETED") return "COMPLETED";
  return status;
}

export function getOrderStatusColor(status: OrderStatus): "default" | "info" | "success" | "warning" {
  if (status === "PAYMENT_PENDING" || status === "SERVICE_RENDERED" || status === "ACCEPTANCE_PENDING") return "warning";
  if (status === "PAYMENT_PROCESSING" || status === "CONTRACT_ACCEPTED") return "info";
  if (status === "ACCEPTED" || status === "PAID" || status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "default";
  return "info";
}

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getOrderCardAccentColor(status: OrderStatus) {
  if (status === "PAYMENT_PENDING" || status === "SERVICE_RENDERED" || status === "ACCEPTANCE_PENDING") return "warning.main";
  if (status === "PAYMENT_PROCESSING" || status === "CONTRACT_ACCEPTED") return "info.main";
  if (status === "ACCEPTED" || status === "PAID") return "success.main";
  if (status === "COMPLETED") return "success.main";
  if (status === "CANCELLED") return "text.disabled";
  return "info.main";
}

export type StatusProgressStep = {
  id: string;
  label: string;
  completed: boolean;
};

export function buildOrderStatusFlowSteps(status: OrderStatus): StatusProgressStep[] {
  if (status === "CANCELLED") {
    return [
      {
        id: "cancelled",
        label: "Заказ отменен",
        completed: false,
      },
    ];
  }

  const activeStepId = getOrderFlowActiveStepId(status);
  const activeIndex = Math.max(
    ORDER_STATUS_STEPPER_FLOW.findIndex((step) => step === activeStepId),
    0
  );

  return ORDER_STATUS_STEPPER_FLOW.map((step, index) => ({
    id: step,
    label:
      step === "CONTRACT"
        ? "Договор"
        : step === "ESCROW"
          ? getEscrowStepLabel(status)
          : step === "WORK"
            ? getWorkStepLabel(status)
            : step === "ACCEPTANCE"
              ? getAcceptanceStepLabel(status)
              : step === "PAYOUT"
                ? getPayoutStepLabel(status)
                : "Завершен",
    completed: activeIndex > index,
  }));
}


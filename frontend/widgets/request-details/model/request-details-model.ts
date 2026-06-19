import type { RequestCustomerDto, RequestProDto, RequestStatus, StatusProgressStep } from "@/entities/request";
import {
  buildCustomerRequestFlowSteps,
  buildRequestFlowSteps,
  formatRequestDate,
  getCustomerRequestFlowActiveStepId,
  getRequestFlowActiveStepId,
  isOrderExecutionStatus,
  isOpenRequestStatus,
} from "@/entities/request";

export type RequestDetailsSide = "customer" | "provider";

export type RequestDetailsActionId =
  | "openOfferDialog"
  | "acceptResult"
  | "sendRemarks"
  | "startWork"
  | "markRendered"
  | "requestAcceptance"
  | "complete"
  | "declineOffer"
  | "remarkAdd"
  | "remarkComplete";

export type RequestDetailsActionDescriptor = {
  id: RequestDetailsActionId;
  label: string;
  variant: "contained" | "outlined";
  color: "primary" | "secondary" | "success" | "warning";
  disabled?: boolean;
};

export type RequestDetailsInfoRow = {
  label: string;
  value: string;
};

export type RequestDetailsStateId =
  | "NEW"
  | "DISCUSSING"
  | "CONTRACT"
  | "WORK"
  | "ACCEPTANCE"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export type RequestDetailsViewModel = {
  steps: StatusProgressStep[];
  activeStepId: string;
  muted: boolean;
  lockedAlert?: { title: string };
  note: string | null;
  infoRows: RequestDetailsInfoRow[];
  actions: RequestDetailsActionDescriptor[];
  autoAcceptAtLabel: string | null;
};

export type BuildCustomerRequestDetailsInput = {
  side: "customer";
  request: RequestCustomerDto;
  canAcceptContract: boolean;
};

export type BuildProviderRequestDetailsInput = {
  side: "provider";
  request: RequestProDto;
};

export type BuildRequestDetailsInput = BuildCustomerRequestDetailsInput | BuildProviderRequestDetailsInput;

function resolveStateIdFromStatus(status: RequestCustomerDto["status"]): RequestDetailsStateId {
  if (status === "CLOSED") return "CLOSED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "ACCEPTANCE_PENDING" || status === "ACCEPTED") return "ACCEPTANCE";
  if (status === "ACTIVE" || status === "SERVICE_RENDERED") return "WORK";
  if (status === "PROVIDER_SELECTED" || status === "CONTRACT_ACCEPTED") return "CONTRACT";
  if (status === "DISCUSSING" || status === "TERMS_AGREED") return "DISCUSSING";
  return "NEW";
}

function resolveStateIdFromAnyStatus(status: RequestStatus): RequestDetailsStateId {
  return resolveStateIdFromStatus(status);
}

function buildCustomerPendingInfo(req: RequestCustomerDto): string | null {
  const selectedCount = req.selectedProviderIds?.length ?? 0;
  if (isOrderExecutionStatus(req.status)) return null;
  if (req.status === "PROVIDER_SELECTED") return null;
  if (req.status === "CLOSED") return null;
  if (selectedCount === 0 || !req.lastSelectionAt) return null;
  const when = formatRequestDate(req.lastSelectionAt);
  if (selectedCount === 1) return `Вы выбрали компанию для диалога · ${when}`;
  return `Вы выбрали компании для диалога: ${selectedCount} · ${when}`;
}

function buildProviderPendingInfo(req: RequestProDto): string | null {
  if (req.offerStatus === "SELECTED") return "Клиент выбрал вас исполнителем. Подготовьте и отправьте договор.";
  if (req.offerStatus === "DECLINED") return "Вы отказались от предложения.";
  return null;
}

type CustomerStateCtx = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
};

type ProviderStateCtx = {
  request: RequestProDto;
};

type RequestDetailsState<TCtx> = {
  id: RequestDetailsStateId;
  build: (ctx: TCtx) => Pick<RequestDetailsViewModel, "note" | "actions" | "autoAcceptAtLabel">;
};

function buildCustomerState(id: RequestDetailsStateId): RequestDetailsState<CustomerStateCtx> {
  if (id === "CONTRACT") {
    return {
      id,
      build: ({ request, canAcceptContract }) => ({
        note: buildCustomerPendingInfo(request),
        actions: canAcceptContract
          ? [
              {
                id: "openOfferDialog",
                label: "Заключить договор",
                variant: "contained",
                color: "success",
              },
            ]
          : [],
        autoAcceptAtLabel: null,
      }),
    };
  }

  if (id === "ACCEPTANCE") {
    return {
      id,
      build: ({ request }) => ({
        note: null,
        actions:
          request.status === "ACCEPTANCE_PENDING"
            ? [
                { id: "acceptResult", label: "Принять результат", variant: "contained", color: "success" },
                { id: "sendRemarks", label: "Отправить замечания", variant: "outlined", color: "warning" },
              ]
            : [],
        autoAcceptAtLabel: request.autoAcceptAt ? `Автопринятие: ${formatRequestDate(request.autoAcceptAt)}` : null,
      }),
    };
  }

  return {
    id,
    build: ({ request }) => ({
      note: buildCustomerPendingInfo(request),
      actions: [],
      autoAcceptAtLabel: null,
    }),
  };
}

function buildProviderState(id: RequestDetailsStateId): RequestDetailsState<ProviderStateCtx> {
  if (id === "CONTRACT") {
    return {
      id,
      build: ({ request }) => ({
        note: buildProviderPendingInfo(request),
        actions: request.isLocked
          ? []
          : [
              ...(request.status === "CONTRACT_ACCEPTED"
                ? [{ id: "startWork", label: "Начать работу", variant: "contained", color: "success" } satisfies RequestDetailsActionDescriptor]
                : []),
              ...(!isOrderExecutionStatus(request.status) && request.offerStatus === "SELECTED"
                ? [{ id: "declineOffer", label: "Отказать", variant: "outlined", color: "secondary" } satisfies RequestDetailsActionDescriptor]
                : []),
            ],
        autoAcceptAtLabel: null,
      }),
    };
  }

  if (id === "WORK") {
    return {
      id,
      build: ({ request }) => ({
        note: buildProviderPendingInfo(request),
        actions: request.isLocked
          ? []
          : request.status === "ACTIVE"
            ? [{ id: "markRendered", label: "Услуга выполнена", variant: "contained", color: "success" }]
            : request.status === "SERVICE_RENDERED"
              ? [{ id: "requestAcceptance", label: "Передать на принятие", variant: "contained", color: "success" }]
              : [],
        autoAcceptAtLabel: null,
      }),
    };
  }

  if (id === "ACCEPTANCE") {
    return {
      id,
      build: ({ request }) => ({
        note: buildProviderPendingInfo(request),
        actions: request.isLocked
          ? []
          : request.status === "ACCEPTED"
            ? [{ id: "complete", label: "Завершить", variant: "contained", color: "success" }]
            : [],
        autoAcceptAtLabel: null,
      }),
    };
  }

  return {
    id,
    build: ({ request }) => ({
      note: buildProviderPendingInfo(request),
      actions:
        request.isLocked || isOrderExecutionStatus(request.status) || request.offerStatus !== "SELECTED"
          ? []
          : [{ id: "declineOffer", label: "Отказать", variant: "outlined", color: "secondary" }],
      autoAcceptAtLabel: null,
    }),
  };
}

export function buildRequestDetailsViewModel(input: BuildRequestDetailsInput): RequestDetailsViewModel {
  const stateId = resolveStateIdFromAnyStatus(input.request.status);

  const muted = input.side === "provider" ? input.request.isLocked : false;

  const steps =
    input.side === "customer"
      ? buildCustomerRequestFlowSteps(input.request)
      : buildRequestFlowSteps(input.request.status);

  const activeStepId =
    input.side === "customer"
      ? getCustomerRequestFlowActiveStepId(input.request)
      : getRequestFlowActiveStepId(input.request.status);

  const infoRows: RequestDetailsInfoRow[] = [];
  if (input.request.location) {
    infoRows.push({ label: "Локация", value: input.request.location });
  }
  if (input.side === "provider") {
    infoRows.push({ label: "Диалогов", value: String(input.request.conversationsCount) });
  }

  const lockedAlert =
    input.side === "provider" && input.request.isLocked
      ? { title: "Заказ уже оформлен другим провайдером." }
      : undefined;

  const stateVm =
    input.side === "customer"
      ? buildCustomerState(stateId).build({
          request: input.request,
          canAcceptContract: input.canAcceptContract,
        })
      : buildProviderState(stateId).build({ request: input.request });

  // In both UIs we don't show pending info for completed/cancelled/closed.
  const noteAllowed = isOpenRequestStatus(input.request.status);

  return {
    steps,
    activeStepId,
    muted,
    lockedAlert,
    note: noteAllowed ? stateVm.note : null,
    infoRows,
    actions: stateVm.actions,
    autoAcceptAtLabel: stateVm.autoAcceptAtLabel,
  };
}


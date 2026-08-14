import type { RequestCustomerDto, RequestProDto, RequestStatus } from "@/entities/request";
import {
  formatKopecksRub,
  formatRequestDate,
  hasRequestLock,
  isContractPhase,
  isOrderExecutionStatus,
  isOpenRequestStatus,
} from "@/entities/request";

export type RequestLifecycleActionId =
  | "openOfferDialog"
  | "acceptResult"
  | "startWork"
  | "markRendered"
  | "requestAcceptance"
  | "complete"
  | "declineOffer";

export type RequestLifecycleActionDescriptor = {
  id: RequestLifecycleActionId;
  label: string;
  variant: "contained" | "outlined";
  color: "primary" | "secondary" | "success" | "warning";
  disabled?: boolean;
};

export type RequestLifecycleInfoRow = {
  label: string;
  value: string;
};

export type RequestLifecycleStateId =
  | "NEW"
  | "DISCUSSING"
  | "CONTRACT"
  | "WORK"
  | "ACCEPTANCE"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export type RequestLifecycleViewModel = {
  lockedAlert?: { title: string };
  note: string | null;
  infoRows: RequestLifecycleInfoRow[];
  actions: RequestLifecycleActionDescriptor[];
  autoAcceptAtLabel: string | null;
};

export type BuildCustomerRequestLifecycleInput = {
  side: "customer";
  request: RequestCustomerDto;
  canAcceptContract: boolean;
};

export type BuildProviderRequestLifecycleInput = {
  side: "provider";
  request: RequestProDto;
};

export type BuildRequestLifecycleInput = BuildCustomerRequestLifecycleInput | BuildProviderRequestLifecycleInput;

function resolveStateIdFromRequest(req: {
  status: RequestStatus;
  lockedAt: string | null;
}): RequestLifecycleStateId {
  const { status } = req;
  if (status === "CLOSED") return "CLOSED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "ACCEPTANCE_PENDING" || status === "ACCEPTED") return "ACCEPTANCE";
  if (status === "ACTIVE") return "WORK";
  if (isContractPhase(req)) return "CONTRACT";
  if (status === "DISCUSSING" || status === "TERMS_AGREED") return "DISCUSSING";
  return "NEW";
}

function remainingPayNote(remainingAmountKopecks: number | null): string | null {
  if (remainingAmountKopecks == null || remainingAmountKopecks <= 0) return null;
  return `Осталось доплатить ${formatKopecksRub(remainingAmountKopecks)}. Перевод вне сайта — исполнитель отметит поступление.`;
}

function buildCustomerPendingInfo(req: RequestCustomerDto): string | null {
  const selectedCount = req.selectedProviderIds?.length ?? 0;
  if (isOrderExecutionStatus(req.status)) return null;
  if (hasRequestLock(req)) return null;
  if (req.status === "CLOSED") return null;
  if (selectedCount === 0 || !req.lastSelectionAt) return null;
  const when = formatRequestDate(req.lastSelectionAt);
  if (selectedCount === 1) return `Вы выбрали компанию для диалога · ${when}`;
  return `Вы выбрали компании для диалога: ${selectedCount} · ${when}`;
}

function buildProviderPendingInfo(req: RequestProDto): string | null {
  if (req.offerStatus === "DECLINED") return "Вы отказались от предложения.";
  if (req.offerStatus === "SELECTED" && hasRequestLock(req) && !isOrderExecutionStatus(req.status)) {
    return "Клиент выбрал вас исполнителем. Подготовьте и отправьте договор.";
  }
  return null;
}

type CustomerStateCtx = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
};

type ProviderStateCtx = {
  request: RequestProDto;
};

type RequestLifecycleState<TCtx> = {
  id: RequestLifecycleStateId;
  build: (ctx: TCtx) => Pick<RequestLifecycleViewModel, "note" | "actions" | "autoAcceptAtLabel">;
};

function buildCustomerState(id: RequestLifecycleStateId): RequestLifecycleState<CustomerStateCtx> {
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
        note: remainingPayNote(request.remainingAmountKopecks),
        actions:
          request.status === "ACCEPTANCE_PENDING"
            ? [{ id: "acceptResult", label: "Принять результат", variant: "contained", color: "success" }]
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

function buildProviderState(id: RequestLifecycleStateId): RequestLifecycleState<ProviderStateCtx> {
  if (id === "CONTRACT") {
    return {
      id,
      build: ({ request }) => ({
        note: buildProviderPendingInfo(request),
        actions: request.isLocked
          ? []
          : !isOrderExecutionStatus(request.status) && request.offerStatus === "SELECTED"
            ? [{ id: "declineOffer", label: "Отказаться от заявки", variant: "outlined", color: "secondary" }]
            : [],
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
            : [],
        autoAcceptAtLabel: null,
      }),
    };
  }

  if (id === "ACCEPTANCE") {
    return {
      id,
      build: ({ request }) => {
        const remainingNote = remainingPayNote(request.remainingAmountKopecks);
        const completeBlocked = request.remainingAmountKopecks != null && request.remainingAmountKopecks > 0;
        return {
          note: remainingNote ?? buildProviderPendingInfo(request),
          actions: request.isLocked
            ? []
            : request.status === "ACCEPTED"
              ? [
                  {
                    id: "complete",
                    label: "Завершить",
                    variant: "contained",
                    color: "success",
                    disabled: completeBlocked,
                  },
                ]
              : [],
          autoAcceptAtLabel: null,
        };
      },
    };
  }

  return {
    id,
    build: ({ request }) => ({
      note: buildProviderPendingInfo(request),
      actions:
        request.isLocked || isOrderExecutionStatus(request.status) || request.offerStatus !== "SELECTED"
          ? []
          : [{ id: "declineOffer", label: "Отказаться от заявки", variant: "outlined", color: "secondary" }],
      autoAcceptAtLabel: null,
    }),
  };
}

export function buildRequestLifecycleViewModel(input: BuildRequestLifecycleInput): RequestLifecycleViewModel {
  const stateId = resolveStateIdFromRequest(input.request);

  const infoRows: RequestLifecycleInfoRow[] = [];
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

  const noteAllowed = isOpenRequestStatus(input.request.status);

  return {
    lockedAlert,
    note: noteAllowed ? stateVm.note : null,
    infoRows,
    actions: stateVm.actions,
    autoAcceptAtLabel: stateVm.autoAcceptAtLabel,
  };
}

export function isLifecycleEmpty(vm: RequestLifecycleViewModel): boolean {
  return (
    !vm.lockedAlert &&
    !vm.note &&
    !vm.autoAcceptAtLabel &&
    vm.infoRows.length === 0 &&
    vm.actions.length === 0
  );
}

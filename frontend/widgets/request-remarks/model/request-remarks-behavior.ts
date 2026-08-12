import type { RequestCustomerDto, RequestProDto, RequestRemarkDto } from "@/entities/request";

export type RequestRemarksActionId = "sendRemarks" | "remarkAdd" | "remarkComplete";
export type RequestRemarksSubmitActionId = "sendRemarks" | "remarkAdd";

export type RequestRemarksItemViewModel = {
  id: string;
  text: string;
  status: RequestRemarkDto["status"];
  meta: string;
  canComplete: boolean;
  /** Чужое замечание для текущей стороны — подсвечиваем title цветом info. */
  highlightAsIncoming: boolean;
};

export type RequestRemarksViewModel = {
  canAdd: boolean;
  submitActionId: RequestRemarksSubmitActionId;
  collapsible: boolean;
  defaultExpanded: boolean;
  expandedResetKey: string;
  /** Для текста подтверждения: кого предупреждаем, что увидит статус DONE. */
  viewerSide: RequestRemarkDto["authorSide"];
  items: RequestRemarksItemViewModel[];
};

export type RequestRemarksBehavior = {
  getViewModel: () => RequestRemarksViewModel | null;
  run: (action: { id: string; payload?: unknown }) => Promise<void> | void;
};

export type CreateCustomerRequestRemarksBehaviorInput = {
  request: RequestCustomerDto;
  remarks: RequestRemarkDto[];
  actions: {
    sendRemarks: (text: string) => Promise<void> | void;
    remarkAdd: (text: string) => Promise<void> | void;
    remarkComplete: (remarkId: string) => Promise<void> | void;
  };
};

export type CreateProviderRequestRemarksBehaviorInput = {
  request: RequestProDto;
  remarks: RequestRemarkDto[];
  actions: {
    remarkAdd: (text: string) => Promise<void> | void;
    remarkComplete: (remarkId: string) => Promise<void> | void;
  };
};

function shouldShowRemarksSection(status: RequestCustomerDto["status"], remarksCount: number) {
  return status === "ACCEPTANCE_PENDING" || status === "ACTIVE" || remarksCount > 0;
}

function isRemarksActionId(value: string): value is RequestRemarksActionId {
  return value === "sendRemarks" || value === "remarkAdd" || value === "remarkComplete";
}

function readTextPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const text = (payload as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

function readRemarkIdPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const remarkId = (payload as { remarkId?: unknown }).remarkId;
  return typeof remarkId === "string" ? remarkId : "";
}

function formatRemarkMeta(args: { remark: RequestRemarkDto; viewerSide: RequestRemarkDto["authorSide"] }) {
  const { remark: r } = args;
  const side = r.authorSide === "CUSTOMER" ? "От заказчика" : "От исполнителя";
  return `${side} · ${new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(r.createdAt))}`;
}

function mapItems(args: {
  remarks: RequestRemarkDto[];
  canComplete: boolean;
  completeAuthorSide: RequestRemarkDto["authorSide"];
  incomingAuthorSide: RequestRemarkDto["authorSide"];
  viewerSide: RequestRemarkDto["authorSide"];
}): RequestRemarksItemViewModel[] {
  return args.remarks.map((r) => ({
    id: r.id,
    text: r.text,
    status: r.status,
    meta: formatRemarkMeta({ remark: r, viewerSide: args.viewerSide }),
    canComplete: args.canComplete && r.status === "OPEN" && r.authorSide === args.completeAuthorSide,
    highlightAsIncoming: r.authorSide === args.incomingAuthorSide,
  }));
}

export function createCustomerRequestRemarksBehavior(
  input: CreateCustomerRequestRemarksBehaviorInput
): RequestRemarksBehavior {
  return {
    getViewModel: () => {
      if (!shouldShowRemarksSection(input.request.status, input.remarks.length)) return null;
      const canAdd = input.request.status === "ACCEPTANCE_PENDING" || input.request.status === "ACTIVE";
      const canComplete = input.request.status === "ACTIVE";
      const submitActionId: RequestRemarksSubmitActionId =
        input.request.status === "ACCEPTANCE_PENDING" ? "sendRemarks" : "remarkAdd";
      const collapsible = input.request.status === "ACCEPTED" || input.request.status === "COMPLETED";
      return {
        canAdd,
        submitActionId,
        collapsible,
        defaultExpanded: !collapsible,
        expandedResetKey: `${input.request.id}:${input.request.status}`,
        viewerSide: "CUSTOMER",
        items: mapItems({
          remarks: input.remarks,
          canComplete,
          completeAuthorSide: "PROVIDER",
          incomingAuthorSide: "PROVIDER",
          viewerSide: "CUSTOMER",
        }),
      };
    },
    run: async ({ id, payload }) => {
      if (!isRemarksActionId(id)) return;
      if (id === "sendRemarks") {
        await input.actions.sendRemarks(readTextPayload(payload));
        return;
      }
      if (id === "remarkAdd") {
        await input.actions.remarkAdd(readTextPayload(payload));
        return;
      }
      if (id === "remarkComplete") {
        await input.actions.remarkComplete(readRemarkIdPayload(payload));
      }
    },
  };
}

export function createProviderRequestRemarksBehavior(
  input: CreateProviderRequestRemarksBehaviorInput
): RequestRemarksBehavior {
  return {
    getViewModel: () => {
      if (!shouldShowRemarksSection(input.request.status, input.remarks.length)) return null;
      const canAdd = input.request.status === "ACCEPTANCE_PENDING" || input.request.status === "ACTIVE";
      const canComplete = input.request.status === "ACTIVE";
      const collapsible = input.request.status === "ACCEPTED" || input.request.status === "COMPLETED";
      return {
        canAdd,
        submitActionId: "remarkAdd",
        collapsible,
        defaultExpanded: !collapsible,
        expandedResetKey: `${input.request.id}:${input.request.status}`,
        viewerSide: "PROVIDER",
        items: mapItems({
          remarks: input.remarks,
          canComplete,
          completeAuthorSide: "CUSTOMER",
          incomingAuthorSide: "CUSTOMER",
          viewerSide: "PROVIDER",
        }),
      };
    },
    run: async ({ id, payload }) => {
      if (!isRemarksActionId(id)) return;
      if (id === "remarkAdd") {
        await input.actions.remarkAdd(readTextPayload(payload));
        return;
      }
      if (id === "remarkComplete") {
        await input.actions.remarkComplete(readRemarkIdPayload(payload));
      }
    },
  };
}

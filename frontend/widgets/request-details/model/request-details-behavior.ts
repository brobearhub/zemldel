import type { ReactNode } from "react";
import type { RequestCustomerDto, RequestProDto, RequestRemarkDto } from "@/entities/request";
import {
  buildRequestDetailsViewModel,
  type RequestDetailsActionDescriptor,
  type RequestDetailsActionId,
  type RequestDetailsViewModel,
} from "./request-details-model";

export type RequestDetailsAction = RequestDetailsActionDescriptor & {
  // keep compatibility; descriptor already supports disabled
};

export type RequestDetailsRemarkItemViewModel = {
  id: string;
  text: string;
  status: RequestRemarkDto["status"];
  meta: string;
  canComplete: boolean;
};

export type RequestDetailsRemarksSectionViewModel = {
  canAdd: boolean;
  items: RequestDetailsRemarkItemViewModel[];
};

export type RequestDetailsBehaviorViewModel = Omit<RequestDetailsViewModel, "actions"> & {
  bottomSlot?: ReactNode;
  actions: RequestDetailsAction[];
  remarksSection?: RequestDetailsRemarksSectionViewModel;
};

export type RequestDetailsBehavior = {
  getViewModel: () => RequestDetailsBehaviorViewModel;
  run: (action: { id: string; payload?: unknown }) => Promise<void> | void;
};

export type CreateCustomerRequestDetailsBehaviorInput = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
  bottomSlot?: ReactNode;
  remarks: RequestRemarkDto[];
  actions: {
    openOfferDialog: () => void;
    acceptResult: () => Promise<void> | void;
    sendRemarks: () => Promise<void> | void;
    remarkAdd: (text: string) => Promise<void> | void;
    remarkComplete: (remarkId: string) => Promise<void> | void;
  };
};

export type CreateProviderRequestDetailsBehaviorInput = {
  request: RequestProDto;
  bottomSlot?: ReactNode;
  remarks: RequestRemarkDto[];
  actions: {
    startWork: () => Promise<void> | void;
    markRendered: () => Promise<void> | void;
    requestAcceptance: () => Promise<void> | void;
    complete: () => Promise<void> | void;
    declineOffer: () => Promise<void> | void;
    remarkAdd: (text: string) => Promise<void> | void;
    remarkComplete: (remarkId: string) => Promise<void> | void;
  };
};

function shouldShowRemarksSection(status: RequestCustomerDto["status"], remarksCount: number) {
  // Show the section during acceptance (when user can add remarks),
  // during work (when the other side may complete remarks),
  // or whenever there are existing remarks to display.
  return status === "ACCEPTANCE_PENDING" || status === "ACTIVE" || remarksCount > 0;
}

function isRequestDetailsActionId(value: string): value is RequestDetailsActionId {
  return (
    value === "openOfferDialog" ||
    value === "acceptResult" ||
    value === "sendRemarks" ||
    value === "startWork" ||
    value === "markRendered" ||
    value === "requestAcceptance" ||
    value === "complete" ||
    value === "declineOffer" ||
    value === "remarkAdd" ||
    value === "remarkComplete"
  );
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

function formatRemarkMeta(r: RequestRemarkDto) {
  const side = r.authorSide === "CUSTOMER" ? "От заказчика" : "От исполнителя";
  return `${side} · ${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(r.createdAt))}`;
}

export function createCustomerRequestDetailsBehavior(input: CreateCustomerRequestDetailsBehaviorInput): RequestDetailsBehavior {
  return {
    getViewModel: () => {
      const vm = buildRequestDetailsViewModel({
        side: "customer",
        request: input.request,
        canAcceptContract: input.canAcceptContract,
      });
      const canAdd = input.request.status === "ACCEPTANCE_PENDING";
      const canComplete = input.request.status === "ACTIVE";
      const hasOpenCustomerRemarks = input.remarks.some((r) => r.status === "OPEN" && r.authorSide === "CUSTOMER");
      const showRemarks = shouldShowRemarksSection(input.request.status, input.remarks.length);
      return {
        ...vm,
        bottomSlot: input.bottomSlot,
        actions: vm.actions.map((a) =>
          a.id === "sendRemarks" ? { ...a, disabled: !hasOpenCustomerRemarks } : a
        ),
        remarksSection: showRemarks
          ? {
              canAdd,
              items: input.remarks.map((r) => ({
                id: r.id,
                text: r.text,
                status: r.status,
                meta: formatRemarkMeta(r),
                canComplete: canComplete && r.status === "OPEN" && r.authorSide === "PROVIDER",
              })),
            }
          : undefined,
      };
    },
    run: async ({ id, payload }) => {
      if (!isRequestDetailsActionId(id)) return;
      if (id === "openOfferDialog") {
        input.actions.openOfferDialog();
        return;
      }
      if (id === "acceptResult") {
        await input.actions.acceptResult();
        return;
      }
      if (id === "sendRemarks") {
        await input.actions.sendRemarks();
        return;
      }
      if (id === "remarkAdd") {
        const text = readTextPayload(payload);
        await input.actions.remarkAdd(text);
        return;
      }
      if (id === "remarkComplete") {
        const remarkId = readRemarkIdPayload(payload);
        await input.actions.remarkComplete(remarkId);
        return;
      }
    },
  };
}

export function createProviderRequestDetailsBehavior(input: CreateProviderRequestDetailsBehaviorInput): RequestDetailsBehavior {
  return {
    getViewModel: () => {
      const vm = buildRequestDetailsViewModel({ side: "provider", request: input.request });
      const canAdd = input.request.status === "ACCEPTANCE_PENDING";
      const canComplete = input.request.status === "ACTIVE";
      const showRemarks = shouldShowRemarksSection(input.request.status, input.remarks.length);
      return {
        ...vm,
        bottomSlot: input.bottomSlot,
        actions: vm.actions,
        remarksSection: showRemarks
          ? {
              canAdd,
              items: input.remarks.map((r) => ({
                id: r.id,
                text: r.text,
                status: r.status,
                meta: formatRemarkMeta(r),
                canComplete: canComplete && r.status === "OPEN" && r.authorSide === "CUSTOMER",
              })),
            }
          : undefined,
      };
    },
    run: async ({ id, payload }) => {
      if (!isRequestDetailsActionId(id)) return;
      if (id === "startWork") return await input.actions.startWork();
      if (id === "markRendered") return await input.actions.markRendered();
      if (id === "requestAcceptance") return await input.actions.requestAcceptance();
      if (id === "complete") return await input.actions.complete();
      if (id === "declineOffer") return await input.actions.declineOffer();
      if (id === "remarkAdd") {
        const text = readTextPayload(payload);
        return await input.actions.remarkAdd(text);
      }
      if (id === "remarkComplete") {
        const remarkId = readRemarkIdPayload(payload);
        return await input.actions.remarkComplete(remarkId);
      }
    },
  };
}


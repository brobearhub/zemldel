import type { ReactNode } from "react";
import type { RequestCustomerDto, RequestProDto } from "@/entities/request";
import {
  buildRequestDetailsViewModel,
  type RequestDetailsActionDescriptor,
  type RequestDetailsActionId,
  type RequestDetailsViewModel,
} from "./request-details-model";

export type RequestDetailsAction = RequestDetailsActionDescriptor & {
  // keep compatibility; descriptor already supports disabled
};

export type RequestDetailsBehaviorViewModel = Omit<RequestDetailsViewModel, "actions"> & {
  bottomSlot?: ReactNode;
  actions: RequestDetailsAction[];
};

export type RequestDetailsBehavior = {
  getViewModel: () => RequestDetailsBehaviorViewModel;
  run: (action: { id: string; payload?: unknown }) => Promise<void> | void;
};

export type CreateCustomerRequestDetailsBehaviorInput = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
  bottomSlot?: ReactNode;
  actions: {
    openOfferDialog: () => void;
    acceptResult: () => Promise<void> | void;
  };
};

export type CreateProviderRequestDetailsBehaviorInput = {
  request: RequestProDto;
  bottomSlot?: ReactNode;
  /** Если true — disable кнопки "Услуга выполнена" (markRendered). */
  isMarkRenderedDisabled?: boolean;
  actions: {
    startWork: () => Promise<void> | void;
    markRendered: () => Promise<void> | void;
    requestAcceptance: () => Promise<void> | void;
    complete: () => Promise<void> | void;
    declineOffer: () => Promise<void> | void;
  };
};

function isRequestDetailsActionId(value: string): value is RequestDetailsActionId {
  return (
    value === "openOfferDialog" ||
    value === "acceptResult" ||
    value === "startWork" ||
    value === "markRendered" ||
    value === "requestAcceptance" ||
    value === "complete" ||
    value === "declineOffer"
  );
}

export function createCustomerRequestDetailsBehavior(input: CreateCustomerRequestDetailsBehaviorInput): RequestDetailsBehavior {
  return {
    getViewModel: () => {
      const vm = buildRequestDetailsViewModel({
        side: "customer",
        request: input.request,
        canAcceptContract: input.canAcceptContract,
      });
      return {
        ...vm,
        bottomSlot: input.bottomSlot,
        actions: vm.actions,
      };
    },
    run: async ({ id }) => {
      if (!isRequestDetailsActionId(id)) return;
      if (id === "openOfferDialog") {
        input.actions.openOfferDialog();
        return;
      }
      if (id === "acceptResult") {
        await input.actions.acceptResult();
      }
    },
  };
}

export function createProviderRequestDetailsBehavior(input: CreateProviderRequestDetailsBehaviorInput): RequestDetailsBehavior {
  return {
    getViewModel: () => {
      const vm = buildRequestDetailsViewModel({ side: "provider", request: input.request });
      return {
        ...vm,
        bottomSlot: input.bottomSlot,
        actions: vm.actions.map((a) =>
          a.id === "markRendered" && input.isMarkRenderedDisabled ? { ...a, disabled: true } : a
        ),
      };
    },
    run: async ({ id }) => {
      if (!isRequestDetailsActionId(id)) return;
      if (id === "startWork") return await input.actions.startWork();
      if (id === "markRendered") return await input.actions.markRendered();
      if (id === "requestAcceptance") return await input.actions.requestAcceptance();
      if (id === "complete") return await input.actions.complete();
      if (id === "declineOffer") return await input.actions.declineOffer();
    },
  };
}

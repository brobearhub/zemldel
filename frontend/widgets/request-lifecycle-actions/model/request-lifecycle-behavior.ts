import type { RequestCustomerDto, RequestProDto } from "@/entities/request";
import {
  buildRequestLifecycleViewModel,
  type RequestLifecycleActionId,
  type RequestLifecycleViewModel,
} from "./request-lifecycle-model";

export type RequestLifecycleBehavior = {
  getViewModel: () => RequestLifecycleViewModel;
  run: (action: { id: string; payload?: unknown }) => Promise<void> | void;
};

export type CreateCustomerRequestLifecycleBehaviorInput = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
  actions: {
    openOfferDialog: () => void;
    acceptResult: () => Promise<void> | void;
  };
};

export type CreateProviderRequestLifecycleBehaviorInput = {
  request: RequestProDto;
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

function isRequestLifecycleActionId(value: string): value is RequestLifecycleActionId {
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

export function createCustomerRequestLifecycleBehavior(
  input: CreateCustomerRequestLifecycleBehaviorInput,
): RequestLifecycleBehavior {
  return {
    getViewModel: () =>
      buildRequestLifecycleViewModel({
        side: "customer",
        request: input.request,
        canAcceptContract: input.canAcceptContract,
      }),
    run: async ({ id }) => {
      if (!isRequestLifecycleActionId(id)) return;
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

const MARK_RENDERED_BLOCKED_NOTE =
  "Нельзя отметить услугу выполненной, пока есть невыполненные замечания.";

export function createProviderRequestLifecycleBehavior(
  input: CreateProviderRequestLifecycleBehaviorInput,
): RequestLifecycleBehavior {
  return {
    getViewModel: () => {
      const vm = buildRequestLifecycleViewModel({ side: "provider", request: input.request });
      const markRenderedBlocked = Boolean(input.isMarkRenderedDisabled);
      return {
        ...vm,
        // Why: при OPEN-замечаниях кнопка disabled — рядом нужно явное объяснение.
        note: markRenderedBlocked ? MARK_RENDERED_BLOCKED_NOTE : vm.note,
        actions: vm.actions.map((a) =>
          a.id === "markRendered" && markRenderedBlocked ? { ...a, disabled: true } : a,
        ),
      };
    },
    run: async ({ id }) => {
      if (!isRequestLifecycleActionId(id)) return;
      if (id === "startWork") return await input.actions.startWork();
      if (id === "markRendered") return await input.actions.markRendered();
      if (id === "requestAcceptance") return await input.actions.requestAcceptance();
      if (id === "complete") return await input.actions.complete();
      if (id === "declineOffer") return await input.actions.declineOffer();
    },
  };
}

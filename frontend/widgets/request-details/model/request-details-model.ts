import type { RequestCustomerDto, RequestProDto, StatusProgressStep } from "@/entities/request";
import {
  buildCustomerRequestFlowSteps,
  buildRequestFlowSteps,
  getCustomerRequestFlowActiveStepId,
  getRequestFlowActiveStepId,
} from "@/entities/request";

export type RequestDetailsSide = "customer" | "provider";

export type RequestDetailsViewModel = {
  steps: StatusProgressStep[];
  activeStepId: string;
  muted: boolean;
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

export function buildRequestDetailsViewModel(input: BuildRequestDetailsInput): RequestDetailsViewModel {
  const muted = input.side === "provider" ? input.request.isLocked : false;

  const steps =
    input.side === "customer"
      ? buildCustomerRequestFlowSteps(input.request)
      : buildRequestFlowSteps(input.request);

  const activeStepId =
    input.side === "customer"
      ? getCustomerRequestFlowActiveStepId(input.request)
      : getRequestFlowActiveStepId(input.request);

  return { steps, activeStepId, muted };
}

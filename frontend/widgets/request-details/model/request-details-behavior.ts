import type { RequestCustomerDto, RequestProDto } from "@/entities/request";
import { buildRequestDetailsViewModel, type RequestDetailsViewModel } from "./request-details-model";

export type RequestDetailsBehaviorViewModel = RequestDetailsViewModel;

export type RequestDetailsBehavior = {
  getViewModel: () => RequestDetailsBehaviorViewModel;
};

export type CreateCustomerRequestDetailsBehaviorInput = {
  request: RequestCustomerDto;
  canAcceptContract: boolean;
};

export type CreateProviderRequestDetailsBehaviorInput = {
  request: RequestProDto;
};

export function createCustomerRequestDetailsBehavior(
  input: CreateCustomerRequestDetailsBehaviorInput,
): RequestDetailsBehavior {
  return {
    getViewModel: () =>
      buildRequestDetailsViewModel({
        side: "customer",
        request: input.request,
        canAcceptContract: input.canAcceptContract,
      }),
  };
}

export function createProviderRequestDetailsBehavior(
  input: CreateProviderRequestDetailsBehaviorInput,
): RequestDetailsBehavior {
  return {
    getViewModel: () => buildRequestDetailsViewModel({ side: "provider", request: input.request }),
  };
}

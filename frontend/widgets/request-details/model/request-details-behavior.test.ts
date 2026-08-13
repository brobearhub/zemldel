import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { createCustomerRequestDetailsBehavior, createProviderRequestDetailsBehavior } from "./request-details-behavior";

function makeCustomer(overrides: Partial<RequestCustomerDto> = {}): RequestCustomerDto {
  return {
    id: "r1",
    subjectType: "FREEFORM" satisfies RequestSubjectType,
    status: "NEW" satisfies RequestStatus,
    serviceId: null,
    categoryId: null,
    message: null,
    location: null,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    selectedProviderIds: [],
    declinedProviderIds: [],
    lastSelectionAt: null,
    offers: [],
    requestCityId: null,
    lockedAt: null,
    serviceTitle: null,
    providerName: null,
    providerPhone: null,
    providerEmail: null,
    providerImage: null,
    customerName: null,
    customerEmail: null,
    customerUserId: "u1",
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

function makeProvider(overrides: Partial<RequestProDto> = {}): RequestProDto {
  return {
    id: "r1",
    subjectType: "FREEFORM" satisfies RequestSubjectType,
    serviceId: null,
    serviceTitle: null,
    categoryId: null,
    categoryName: null,
    message: null,
    location: null,
    status: "NEW" satisfies RequestStatus,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    offerStatus: null,
    offerSelectedAt: null,
    offerDeclinedAt: null,
    requestCityId: null,
    lockedAt: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerImage: null,
    conversationsCount: 0,
    isLocked: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("request-details behavior", () => {
  it("customer: exposes progress view model only", () => {
    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
    });
    const vm = behavior.getViewModel();
    expect(vm.activeStepId).toBe("ACCEPTANCE");
    expect(vm.steps.length).toBeGreaterThan(0);
    expect("actions" in vm).toBe(false);
  });

  it("provider: muted when locked", () => {
    const behavior = createProviderRequestDetailsBehavior({
      request: makeProvider({ status: "ACTIVE", isLocked: true }),
    });
    expect(behavior.getViewModel().muted).toBe(true);
  });
});

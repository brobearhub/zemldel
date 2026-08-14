import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { buildRequestDetailsViewModel } from "./request-details-model";

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
    totalAmountKopecks: null,
    paidAmountKopecks: 0,
    remainingAmountKopecks: null,
    payments: [],
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
    totalAmountKopecks: null,
    paidAmountKopecks: 0,
    remainingAmountKopecks: null,
    payments: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("buildRequestDetailsViewModel", () => {
  it("provider: ACTIVE maps to WORK step and muted=false", () => {
    const req = makeProvider({
      status: "ACTIVE",
      offerStatus: "SELECTED",
      lockedAt: "2026-08-06T00:00:00.000Z",
    });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });
    expect(vm.activeStepId).toBe("WORK");
    expect(vm.muted).toBe(false);
    expect(vm.steps.length).toBeGreaterThan(0);
  });

  it("provider: locked request is muted", () => {
    const req = makeProvider({ status: "ACTIVE", isLocked: true });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });
    expect(vm.muted).toBe(true);
  });

  it("customer: ACCEPTANCE_PENDING maps to ACCEPTANCE step", () => {
    const req = makeCustomer({ status: "ACCEPTANCE_PENDING" });
    const vm = buildRequestDetailsViewModel({ side: "customer", request: req, canAcceptContract: false });
    expect(vm.activeStepId).toBe("ACCEPTANCE");
  });
});

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
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    offerStatus: null,
    offerSelectedAt: null,
    offerDeclinedAt: null,
    requestCityId: null,
    lockedAt: null,
    conversationsCount: 0,
    isLocked: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("buildRequestDetailsViewModel", () => {
  it("customer: shows acceptance actions + remarks on ACCEPTANCE_PENDING", () => {
    const req = makeCustomer({
      status: "ACCEPTANCE_PENDING",
      autoAcceptAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
    });
    const vm = buildRequestDetailsViewModel({ side: "customer", request: req, canAcceptContract: false });

    expect(vm.actions.map((a) => a.id)).toEqual(["acceptResult", "sendRemarks"]);
    expect(vm.autoAcceptAtLabel?.startsWith("Автопринятие:")).toBe(true);
  });

  it("customer: shows open offer action when contract can be accepted", () => {
    const req = makeCustomer({ status: "PROVIDER_SELECTED" });
    const vm = buildRequestDetailsViewModel({ side: "customer", request: req, canAcceptContract: true });

    expect(vm.actions.map((a) => a.id)).toEqual(["openOfferDialog"]);
  });

  it("provider: shows locked alert and hides actions when request is locked", () => {
    const req = makeProvider({ status: "ACTIVE", isLocked: true, offerStatus: "SELECTED" });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });

    expect(vm.muted).toBe(true);
    expect(vm.lockedAlert?.title).toBe("Заказ уже оформлен другим провайдером.");
    expect(vm.actions).toEqual([]);
  });

  it("provider: shows start work action on CONTRACT_ACCEPTED", () => {
    const req = makeProvider({ status: "CONTRACT_ACCEPTED", offerStatus: "SELECTED" });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).toContain("startWork");
  });

  it("provider: allows decline on non-execution status when offer is selected", () => {
    const req = makeProvider({ status: "DISCUSSING", offerStatus: "SELECTED" });
    const vm = buildRequestDetailsViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).toContain("declineOffer");
  });
});


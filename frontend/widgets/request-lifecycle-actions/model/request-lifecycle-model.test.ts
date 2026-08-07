import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { buildRequestLifecycleViewModel, isLifecycleEmpty } from "./request-lifecycle-model";

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
    conversationsCount: 0,
    isLocked: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("buildRequestLifecycleViewModel", () => {
  it("customer: shows acceptance action on ACCEPTANCE_PENDING", () => {
    const req = makeCustomer({
      status: "ACCEPTANCE_PENDING",
      autoAcceptAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
    });
    const vm = buildRequestLifecycleViewModel({ side: "customer", request: req, canAcceptContract: false });

    expect(vm.actions.map((a) => a.id)).toEqual(["acceptResult"]);
    expect(vm.autoAcceptAtLabel?.startsWith("Автопринятие:")).toBe(true);
  });

  it("customer: shows open offer action when contract can be accepted", () => {
    const req = makeCustomer({ status: "DISCUSSING", lockedAt: "2026-08-06T00:00:00.000Z" });
    const vm = buildRequestLifecycleViewModel({ side: "customer", request: req, canAcceptContract: true });

    expect(vm.actions.map((a) => a.id)).toEqual(["openOfferDialog"]);
  });

  it("provider: shows locked alert and hides actions when request is locked", () => {
    const req = makeProvider({ status: "ACTIVE", isLocked: true, offerStatus: "SELECTED" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.lockedAlert?.title).toBe("Заказ уже оформлен другим провайдером.");
    expect(vm.actions).toEqual([]);
  });

  it("provider: ACTIVE shows markRendered", () => {
    const req = makeProvider({ status: "ACTIVE", offerStatus: "SELECTED", lockedAt: "2026-08-06T00:00:00.000Z" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).not.toContain("startWork");
    expect(vm.actions.map((a) => a.id)).toContain("markRendered");
  });

  it("provider: ACCEPTANCE_PENDING has no markRendered / requestAcceptance", () => {
    const req = makeProvider({
      status: "ACCEPTANCE_PENDING",
      offerStatus: "SELECTED",
      lockedAt: "2026-08-06T00:00:00.000Z",
    });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).not.toContain("requestAcceptance");
    expect(vm.actions.map((a) => a.id)).not.toContain("markRendered");
  });

  it("provider: allows decline on non-execution status when offer is selected", () => {
    const req = makeProvider({ status: "DISCUSSING", offerStatus: "SELECTED" });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });

    expect(vm.actions.map((a) => a.id)).toContain("declineOffer");
    expect(vm.actions.find((a) => a.id === "declineOffer")?.label).toBe("Отказаться от заявки");
  });

  it("provider: includes dialogs info row", () => {
    const req = makeProvider({ conversationsCount: 1 });
    const vm = buildRequestLifecycleViewModel({ side: "provider", request: req });
    expect(vm.infoRows).toContainEqual({ label: "Диалогов", value: "1" });
  });

  it("isLifecycleEmpty: true when nothing to show", () => {
    const req = makeCustomer({ status: "NEW" });
    const vm = buildRequestLifecycleViewModel({ side: "customer", request: req, canAcceptContract: false });
    expect(isLifecycleEmpty(vm)).toBe(true);
  });
});

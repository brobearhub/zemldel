import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { createCustomerRequestDetailsBehavior, createProviderRequestDetailsBehavior } from "./request-details-behavior";
import { vi } from "vitest";

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

describe("request-details behavior", () => {
  it("customer: getViewModel exposes actions and run dispatches callbacks", async () => {
    const openOfferDialog = vi.fn();
    const acceptResult = vi.fn();
    const sendRemarks = vi.fn();
    const remarkAdd = vi.fn();
    const remarkComplete = vi.fn();

    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "PROVIDER_SELECTED" }),
      canAcceptContract: true,
      remarks: [],
      actions: { openOfferDialog, acceptResult, sendRemarks, remarkAdd, remarkComplete },
    });

    const vm = behavior.getViewModel();
    expect(vm.actions.map((a) => a.id)).toEqual(["openOfferDialog"]);

    await behavior.run({ id: "openOfferDialog" });
    expect(openOfferDialog).toHaveBeenCalledTimes(1);
  });

  it("hides remarks section when status is not acceptance/work and there are no remarks", () => {
    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "CONTRACT_ACCEPTED" }),
      canAcceptContract: false,
      remarks: [],
      actions: {
        openOfferDialog: vi.fn(),
        acceptResult: vi.fn(),
        sendRemarks: vi.fn(),
        remarkAdd: vi.fn(),
        remarkComplete: vi.fn(),
      },
    });

    const vm = behavior.getViewModel();
    expect(vm.remarksSection).toBeUndefined();
  });

  it("customer: remarkAdd uses payload.text", async () => {
    const sendRemarks = vi.fn();
    const remarkAdd = vi.fn();
    const remarkComplete = vi.fn();
    const behavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
      remarks: [],
      actions: {
        openOfferDialog: vi.fn(),
        acceptResult: vi.fn(),
        sendRemarks,
        remarkAdd,
        remarkComplete,
      },
    });

    await behavior.run({ id: "remarkAdd", payload: { text: " test " } });
    expect(remarkAdd).toHaveBeenCalledWith(" test ");
  });

  it("provider: run dispatches to correct callbacks", async () => {
    const startWork = vi.fn();
    const markRendered = vi.fn();
    const requestAcceptance = vi.fn();
    const complete = vi.fn();
    const declineOffer = vi.fn();
    const remarkAdd = vi.fn();
    const remarkComplete = vi.fn();

    const behavior = createProviderRequestDetailsBehavior({
      request: makeProvider({ status: "CONTRACT_ACCEPTED", offerStatus: "SELECTED" }),
      remarks: [],
      actions: { startWork, markRendered, requestAcceptance, complete, declineOffer, remarkAdd, remarkComplete },
    });

    await behavior.run({ id: "startWork" });
    expect(startWork).toHaveBeenCalledTimes(1);

    await behavior.run({ id: "declineOffer" });
    expect(declineOffer).toHaveBeenCalledTimes(1);
  });

  it("exposes canAdd/canComplete rules for remarks section", () => {
    const customerBehavior = createCustomerRequestDetailsBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
      remarks: [
        {
          id: "rm1",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте X",
          createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
          doneAt: null,
        },
        {
          id: "rm2",
          requestId: "r1",
          authorSide: "PROVIDER",
          status: "OPEN",
          text: "Нужны данные Y",
          createdAt: new Date("2026-01-01T10:01:00.000Z").toISOString(),
          doneAt: null,
        },
      ],
      actions: {
        openOfferDialog: vi.fn(),
        acceptResult: vi.fn(),
        sendRemarks: vi.fn(),
        remarkAdd: vi.fn(),
        remarkComplete: vi.fn(),
      },
    });
    const customerVm = customerBehavior.getViewModel();
    expect(customerVm.remarksSection?.canAdd).toBe(true);
    // completion happens only in ACTIVE
    expect(customerVm.remarksSection?.items.some((x) => x.canComplete)).toBe(false);

    const providerBehavior = createProviderRequestDetailsBehavior({
      request: makeProvider({ status: "ACTIVE" }),
      remarks: [
        {
          id: "rm3",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте Z",
          createdAt: new Date("2026-01-01T10:02:00.000Z").toISOString(),
          doneAt: null,
        },
      ],
      actions: {
        startWork: vi.fn(),
        markRendered: vi.fn(),
        requestAcceptance: vi.fn(),
        complete: vi.fn(),
        declineOffer: vi.fn(),
        remarkAdd: vi.fn(),
        remarkComplete: vi.fn(),
      },
    });
    const providerVm = providerBehavior.getViewModel();
    expect(providerVm.remarksSection?.canAdd).toBe(false);
    expect(providerVm.remarksSection?.items[0]?.canComplete).toBe(true);
  });
});


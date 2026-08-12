import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import {
  createCustomerRequestLifecycleBehavior,
  createProviderRequestLifecycleBehavior,
} from "./request-lifecycle-behavior";
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

describe("request-lifecycle behavior", () => {
  it("customer: getViewModel exposes actions and run dispatches callbacks", async () => {
    const openOfferDialog = vi.fn();
    const acceptResult = vi.fn();

    const behavior = createCustomerRequestLifecycleBehavior({
      request: makeCustomer({ status: "DISCUSSING", lockedAt: "2026-08-06T00:00:00.000Z" }),
      canAcceptContract: true,
      actions: { openOfferDialog, acceptResult },
    });

    const vm = behavior.getViewModel();
    expect(vm.actions.map((a) => a.id)).toEqual(["openOfferDialog"]);

    await behavior.run({ id: "openOfferDialog" });
    expect(openOfferDialog).toHaveBeenCalledTimes(1);
  });

  it("customer: acceptResult dispatches on ACCEPTANCE_PENDING", async () => {
    const acceptResult = vi.fn();
    const behavior = createCustomerRequestLifecycleBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      canAcceptContract: false,
      actions: { openOfferDialog: vi.fn(), acceptResult },
    });

    expect(behavior.getViewModel().actions.map((a) => a.id)).toEqual(["acceptResult"]);
    await behavior.run({ id: "acceptResult" });
    expect(acceptResult).toHaveBeenCalledTimes(1);
  });

  it("provider: run dispatches to correct callbacks", async () => {
    const markRendered = vi.fn();
    const declineOffer = vi.fn();

    const behavior = createProviderRequestLifecycleBehavior({
      request: makeProvider({ status: "ACTIVE", offerStatus: "SELECTED" }),
      actions: {
        startWork: vi.fn(),
        markRendered,
        requestAcceptance: vi.fn(),
        complete: vi.fn(),
        declineOffer,
      },
    });

    await behavior.run({ id: "markRendered" });
    expect(markRendered).toHaveBeenCalledTimes(1);

    await behavior.run({ id: "declineOffer" });
    expect(declineOffer).toHaveBeenCalledTimes(1);
  });

  it("provider: disables markRendered when flag is set", () => {
    const behavior = createProviderRequestLifecycleBehavior({
      request: makeProvider({ status: "ACTIVE", offerStatus: "SELECTED" }),
      isMarkRenderedDisabled: true,
      actions: {
        startWork: vi.fn(),
        markRendered: vi.fn(),
        requestAcceptance: vi.fn(),
        complete: vi.fn(),
        declineOffer: vi.fn(),
      },
    });

    const vm = behavior.getViewModel();
    expect(vm.actions.find((a) => a.id === "markRendered")?.disabled).toBe(true);
    expect(vm.note).toMatch(/невыполненные замечания/i);
  });
});

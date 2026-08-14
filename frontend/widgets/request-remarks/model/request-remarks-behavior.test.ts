import type { RequestCustomerDto, RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import {
  createCustomerRequestRemarksBehavior,
  createProviderRequestRemarksBehavior,
} from "./request-remarks-behavior";
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

describe("request-remarks behavior", () => {
  it("hides section when status is not acceptance/work and there are no remarks", () => {
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "DISCUSSING", lockedAt: null }),
      remarks: [],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    expect(behavior.getViewModel()).toBeNull();
  });

  it("shows section on ACTIVE even when there are no remarks (user can add)", () => {
    const customerBehavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACTIVE" }),
      remarks: [],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    expect(customerBehavior.getViewModel()).not.toBeNull();
    expect(customerBehavior.getViewModel()?.canAdd).toBe(true);

    const providerBehavior = createProviderRequestRemarksBehavior({
      request: makeProvider({ status: "ACTIVE" }),
      remarks: [],
      actions: { remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    expect(providerBehavior.getViewModel()).not.toBeNull();
    expect(providerBehavior.getViewModel()?.canAdd).toBe(true);
  });

  it("shows section on ACTIVE when there are remarks", () => {
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACTIVE" }),
      remarks: [
        {
          id: "rm1",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте X",
          createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
          doneAt: null,
          sentAt: null,
        },
      ],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const vm = behavior.getViewModel();
    expect(vm).not.toBeNull();
    expect(vm?.canAdd).toBe(true);
    expect(vm?.submitActionId).toBe("remarkAdd");
    expect(vm?.items.length).toBe(1);
  });

  it("shows section on ACCEPTANCE_PENDING with canAdd and submitActionId=sendRemarks", () => {
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const vm = behavior.getViewModel();
    expect(vm).not.toBeNull();
    expect(vm?.canAdd).toBe(true);
    expect(vm?.submitActionId).toBe("sendRemarks");
    expect(vm?.items).toEqual([]);
  });

  it("customer: remarkAdd and sendRemarks use payload.text", async () => {
    const sendRemarks = vi.fn();
    const remarkAdd = vi.fn();
    const remarkComplete = vi.fn();
    const behavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [],
      actions: { sendRemarks, remarkAdd, remarkComplete },
    });

    await behavior.run({ id: "remarkAdd", payload: { text: " test " } });
    expect(remarkAdd).toHaveBeenCalledWith(" test ");

    await behavior.run({ id: "sendRemarks", payload: { text: " test " } });
    expect(sendRemarks).toHaveBeenCalledWith(" test ");
  });

  it("exposes canAdd/canComplete/highlight rules", () => {
    const customerBehavior = createCustomerRequestRemarksBehavior({
      request: makeCustomer({ status: "ACCEPTANCE_PENDING" }),
      remarks: [
        {
          id: "rm1",
          requestId: "r1",
          authorSide: "CUSTOMER",
          status: "OPEN",
          text: "Сделайте X",
          createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
          doneAt: null,
          sentAt: null,
        },
        {
          id: "rm2",
          requestId: "r1",
          authorSide: "PROVIDER",
          status: "OPEN",
          text: "Нужны данные Y",
          createdAt: new Date("2026-01-01T10:01:00.000Z").toISOString(),
          doneAt: null,
          sentAt: new Date("2026-01-01T10:01:00.000Z").toISOString(),
        },
      ],
      actions: { sendRemarks: vi.fn(), remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const customerVm = customerBehavior.getViewModel();
    expect(customerVm?.canAdd).toBe(true);
    expect(customerVm?.items.some((x) => x.canComplete)).toBe(false);
    expect(customerVm?.items.find((x) => x.id === "rm1")?.highlightAsIncoming).toBe(false);
    expect(customerVm?.items.find((x) => x.id === "rm2")?.highlightAsIncoming).toBe(true);

    const providerBehavior = createProviderRequestRemarksBehavior({
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
          sentAt: new Date("2026-01-01T10:02:00.000Z").toISOString(),
        },
        {
          id: "rm4",
          requestId: "r1",
          authorSide: "PROVIDER",
          status: "OPEN",
          text: "От себя",
          createdAt: new Date("2026-01-01T10:03:00.000Z").toISOString(),
          doneAt: null,
          sentAt: new Date("2026-01-01T10:03:00.000Z").toISOString(),
        },
      ],
      actions: { remarkAdd: vi.fn(), remarkComplete: vi.fn() },
    });
    const providerVm = providerBehavior.getViewModel();
    expect(providerVm?.canAdd).toBe(true);
    expect(providerVm?.submitActionId).toBe("remarkAdd");
    expect(providerVm?.items[0]?.canComplete).toBe(true);
    expect(providerVm?.items.find((x) => x.id === "rm3")?.highlightAsIncoming).toBe(true);
    expect(providerVm?.items.find((x) => x.id === "rm4")?.highlightAsIncoming).toBe(false);
  });

  it("provider: remarkComplete uses payload.remarkId", async () => {
    const remarkComplete = vi.fn();
    const behavior = createProviderRequestRemarksBehavior({
      request: makeProvider({ status: "ACTIVE" }),
      remarks: [],
      actions: { remarkAdd: vi.fn(), remarkComplete },
    });
    await behavior.run({ id: "remarkComplete", payload: { remarkId: "rm3" } });
    expect(remarkComplete).toHaveBeenCalledWith("rm3");
  });
});

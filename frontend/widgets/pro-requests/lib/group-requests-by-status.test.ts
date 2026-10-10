import { describe, expect, it } from "vitest";
import type { RequestProDto, RequestStatus } from "@/entities/request";
import {
  DEFAULT_ENABLED_PRO_REQUEST_STATUSES,
  PRO_REQUEST_BOARD_STATUSES,
  groupProRequestsByStatus,
  mergeProRequestFeedItems,
  toggleProRequestStatus,
} from "./group-requests-by-status";

function request(overrides: Partial<RequestProDto> & Pick<RequestProDto, "id" | "status">): RequestProDto {
  return {
    subjectType: "FREEFORM",
    serviceId: null,
    serviceTitle: null,
    categoryId: null,
    categoryName: null,
    message: "Текст",
    location: null,
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
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerImage: null,
    conversationsCount: 0,
    isLocked: false,
    customerLastMessage: null,
    providerLastMessage: null,
    awaitingCustomerReply: false,
    lastMessageAt: null,
    totalAmountRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    createdAt: "2026-10-06T08:39:00.000Z",
    updatedAt: "2026-10-06T08:39:00.000Z",
    ...overrides,
  };
}

describe("groupProRequestsByStatus", () => {
  it("opens one column for every request status, in lifecycle order", () => {
    const items = PRO_REQUEST_BOARD_STATUSES.map((status) => request({ id: status.toLowerCase(), status }));
    const board = groupProRequestsByStatus(items);

    expect(board.map((column) => column.status)).toEqual([...PRO_REQUEST_BOARD_STATUSES]);
    expect(board).toHaveLength(PRO_REQUEST_BOARD_STATUSES.length);
    for (const column of board) {
      expect(column.items.map((item) => item.id)).toEqual([column.status.toLowerCase()]);
    }
  });

  it("keeps empty status columns and preserves list order inside a column", () => {
    const board = groupProRequestsByStatus([
      request({ id: "discuss-2", status: "DISCUSSING" }),
      request({ id: "new-1", status: "NEW" }),
      request({ id: "discuss-1", status: "DISCUSSING" }),
    ]);

    expect(board).toHaveLength(PRO_REQUEST_BOARD_STATUSES.length);
    expect(board.find((column) => column.status === "NEW")?.items.map((item) => item.id)).toEqual(["new-1"]);
    expect(board.find((column) => column.status === "DISCUSSING")?.items.map((item) => item.id)).toEqual([
      "discuss-2",
      "discuss-1",
    ]);
    expect(board.find((column) => column.status === "ACTIVE")?.items).toEqual([]);
  });

  it("drops an item whose status is not a board column", () => {
    const board = groupProRequestsByStatus([
      request({ id: "known", status: "ACTIVE" }),
      request({ id: "unknown", status: "NOT_A_STATUS" as RequestStatus }),
    ]);

    expect(board.reduce((sum, column) => sum + column.items.length, 0)).toBe(1);
  });
});

describe("DEFAULT_ENABLED_PRO_REQUEST_STATUSES", () => {
  it("turns on the working statuses and leaves the rest off", () => {
    expect([...DEFAULT_ENABLED_PRO_REQUEST_STATUSES]).toEqual([
      "NEW",
      "DISCUSSING",
      "ACTIVE",
      "ACCEPTANCE_PENDING",
      "ACCEPTED",
      "COMPLETED",
    ]);
    expect(PRO_REQUEST_BOARD_STATUSES.filter((status) => !DEFAULT_ENABLED_PRO_REQUEST_STATUSES.includes(status))).toEqual([
      "TERMS_AGREED",
      "CANCELLED",
      "CLOSED",
    ]);
  });
});

describe("toggleProRequestStatus", () => {
  it("turns a status off and back on", () => {
    const withoutNew = toggleProRequestStatus(DEFAULT_ENABLED_PRO_REQUEST_STATUSES, "NEW");
    expect(withoutNew).not.toContain("NEW");

    const withClosed = toggleProRequestStatus(withoutNew, "CLOSED");
    expect(withClosed).toContain("CLOSED");
  });
});

describe("mergeProRequestFeedItems", () => {
  it("keeps the first copy of a request id", () => {
    const inbox = request({ id: "same", status: "ACTIVE", message: "из ленты" });
    const order = request({ id: "same", status: "ACTIVE", message: "из заказов" });
    const onlyOrder = request({ id: "order-only", status: "COMPLETED" });

    const merged = mergeProRequestFeedItems([[inbox], [order, onlyOrder]]);

    expect(merged.map((item) => item.id)).toEqual(["same", "order-only"]);
    expect(merged[0]?.message).toBe("из ленты");
  });
});

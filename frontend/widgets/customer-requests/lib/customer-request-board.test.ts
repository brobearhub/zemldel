import { describe, expect, it } from "vitest";
import type { RequestCustomerDto, RequestStatus } from "@/entities/request";
import { getRequestStatusColor } from "@/entities/request";
import {
  CUSTOMER_REQUEST_BOARD_COLUMNS,
  getCustomerRequestCardContent,
  getCustomerRequestCardTone,
  getCustomerRequestOpenAge,
  groupCustomerRequestsByStatus,
} from "./customer-request-board";

function request(overrides: Partial<RequestCustomerDto> & Pick<RequestCustomerDto, "id" | "status">): RequestCustomerDto {
  return {
    subjectType: "FREEFORM",
    serviceId: null,
    categoryId: null,
    message: "Текст заявки",
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
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: null,
    serviceTitle: null,
    serviceImage: null,
    categoryName: null,
    providerName: null,
    providerPhone: null,
    providerEmail: null,
    providerImage: null,
    customerName: null,
    customerEmail: null,
    customerUserId: null,
    createdAt: "2026-10-05T17:25:00.000Z",
    updatedAt: "2026-10-05T17:25:00.000Z",
    totalAmountRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    canDeleteByCustomer: false,
    ...overrides,
  };
}

describe("CUSTOMER_REQUEST_BOARD_COLUMNS", () => {
  it("follows the request lifecycle order and keeps every status", () => {
    expect(CUSTOMER_REQUEST_BOARD_COLUMNS.map((column) => column.status)).toEqual([
      "NEW",
      "DISCUSSING",
      "TERMS_AGREED",
      "ACTIVE",
      "ACCEPTANCE_PENDING",
      "ACCEPTED",
      "COMPLETED",
      "CANCELLED",
      "CLOSED",
    ]);
    expect(CUSTOMER_REQUEST_BOARD_COLUMNS.map((column) => column.color)).toEqual(
      CUSTOMER_REQUEST_BOARD_COLUMNS.map((column) => getRequestStatusColor(column.status))
    );
  });
});

describe("groupCustomerRequestsByStatus", () => {
  it("places each request into its own status column and keeps API order", () => {
    const statuses = CUSTOMER_REQUEST_BOARD_COLUMNS.map((column) => column.status);
    const items = [
      request({ id: "discuss-later", status: "DISCUSSING", message: "Второе обсуждение" }),
      request({ id: "new-1", status: "NEW" }),
      request({ id: "discuss-first", status: "DISCUSSING", message: "Первое обсуждение" }),
      ...statuses
        .filter((status) => status !== "NEW" && status !== "DISCUSSING")
        .map((status) => request({ id: status.toLowerCase(), status })),
    ];

    const board = groupCustomerRequestsByStatus(items);

    expect(board.map((column) => column.status)).toEqual(statuses);
    expect(board.find((column) => column.status === "NEW")?.items.map((item) => item.id)).toEqual(["new-1"]);
    expect(board.find((column) => column.status === "DISCUSSING")?.items.map((item) => item.id)).toEqual([
      "discuss-later",
      "discuss-first",
    ]);

    for (const status of statuses) {
      const column = board.find((entry) => entry.status === status);
      expect(column?.items.every((item) => item.status === status)).toBe(true);
    }
  });

  it("hides empty columns and shows a column when a request appears", () => {
    const onlyActive = groupCustomerRequestsByStatus([request({ id: "active-1", status: "ACTIVE" })]);

    expect(onlyActive.map((column) => column.status)).toEqual(["ACTIVE"]);
    expect(onlyActive[0]?.items.map((item) => item.id)).toEqual(["active-1"]);

    const withClosed = groupCustomerRequestsByStatus([
      request({ id: "active-1", status: "ACTIVE" }),
      request({ id: "closed-1", status: "CLOSED" }),
    ]);

    expect(withClosed.map((column) => column.status)).toEqual(["ACTIVE", "CLOSED"]);
  });
});

describe("getCustomerRequestCardContent", () => {
  it("uses service or category as title and hides the message", () => {
    expect(
      getCustomerRequestCardContent(
        request({
          id: "1",
          status: "NEW",
          subjectType: "SERVICE",
          serviceTitle: "Межевание участка",
          categoryName: "Кадастр",
          message: "Сделай красиво",
          serviceImage: "https://cdn.example/service.jpg",
        })
      )
    ).toEqual({
      title: "Межевание участка",
      letter: "М",
      photo: "https://cdn.example/service.jpg",
      metaName: null,
    });

    expect(
      getCustomerRequestCardContent(
        request({
          id: "2",
          status: "NEW",
          subjectType: "CATEGORY",
          categoryName: "Кадастр",
          message: "Нужна консультация",
          providerName: "Петров",
        })
      )
    ).toEqual({
      title: "Кадастр",
      letter: "К",
      photo: null,
      metaName: "Петров",
    });
  });

  it("shows only the message for a freeform request and uses the signin house photo", () => {
    expect(
      getCustomerRequestCardContent(
        request({
          id: "3",
          status: "NEW",
          subjectType: "FREEFORM",
          message: "свободная форма отзывы",
          serviceImage: "https://cdn.example/service.jpg",
          providerImage: "https://cdn.example/provider.jpg",
        })
      )
    ).toEqual({
      title: "свободная форма отзывы",
      letter: "С",
      photo: "/hero-bg-house_static_day.jpg",
      metaName: null,
    });
  });
});

describe("getCustomerRequestOpenAge", () => {
  const now = new Date("2026-10-07T17:25:00.000Z");

  it("counts full days from createdAt and picks a Russian day word", () => {
    expect(getCustomerRequestOpenAge("2026-10-07T10:00:00.000Z", now)).toEqual({ days: 0, label: "дней" });
    expect(getCustomerRequestOpenAge("2026-10-06T17:25:00.000Z", now)).toEqual({ days: 1, label: "день" });
    expect(getCustomerRequestOpenAge("2026-10-05T17:25:00.000Z", now)).toEqual({ days: 2, label: "дня" });
    expect(getCustomerRequestOpenAge("2026-10-02T17:25:00.000Z", now)).toEqual({ days: 5, label: "дней" });
  });
});

describe("getCustomerRequestCardTone", () => {
  it("is stable for the same identity", () => {
    const first = request({ id: "same", status: "NEW", providerId: "provider-a" });
    const second = request({ id: "same", status: "DISCUSSING", providerId: "provider-a" });

    expect(getCustomerRequestCardTone(first)).toBe(getCustomerRequestCardTone(second));
    expect(["sage", "warm"]).toContain(getCustomerRequestCardTone(first));
  });
});

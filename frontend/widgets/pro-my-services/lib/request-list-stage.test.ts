import { describe, expect, it } from "vitest";
import type { RequestStatus } from "@/entities/request";
import {
  REQUEST_LIST_STAGES,
  countOpenRequests,
  countRequestsByStage,
  filterRequestsByStage,
  getRequestListStage,
  getRequestListStageLabel,
} from "./request-list-stage";

const LOCKED_AT = "2026-10-01T00:00:00.000Z";

describe("getRequestListStage", () => {
  it.each<[RequestStatus, string | null, ReturnType<typeof getRequestListStage>]>([
    ["NEW", null, "NEW"],
    ["DISCUSSING", null, "DISCUSSING"],
    ["TERMS_AGREED", null, "DISCUSSING"],
    ["NEW", LOCKED_AT, "CONTRACT"],
    ["DISCUSSING", LOCKED_AT, "CONTRACT"],
    ["TERMS_AGREED", LOCKED_AT, "CONTRACT"],
    ["ACTIVE", LOCKED_AT, "WORK"],
    ["ACTIVE", null, "WORK"],
    ["ACCEPTANCE_PENDING", LOCKED_AT, "ACCEPTANCE"],
    ["ACCEPTED", LOCKED_AT, "ACCEPTANCE"],
    ["COMPLETED", LOCKED_AT, "COMPLETED"],
    ["CANCELLED", LOCKED_AT, null],
    ["CLOSED", null, null],
  ])("%s при lockedAt=%s попадает в %s", (status, lockedAt, stage) => {
    expect(getRequestListStage({ status, lockedAt })).toBe(stage);
  });
});

describe("getRequestListStageLabel", () => {
  it("подписывает шаги так, как фильтры шапки", () => {
    expect(REQUEST_LIST_STAGES.map(getRequestListStageLabel)).toEqual([
      "Новые",
      "Обсуждение",
      "Договор",
      "В работе",
      "Принятие",
      "Завершена",
    ]);
  });
});

describe("countRequestsByStage", () => {
  it("считает каждый шаг и оставляет нули", () => {
    expect(
      countRequestsByStage([
        { status: "NEW", lockedAt: null },
        { status: "NEW", lockedAt: null },
        { status: "TERMS_AGREED", lockedAt: null },
        { status: "DISCUSSING", lockedAt: LOCKED_AT },
        { status: "ACCEPTED", lockedAt: LOCKED_AT },
        { status: "COMPLETED", lockedAt: LOCKED_AT },
        { status: "CANCELLED", lockedAt: null },
      ]),
    ).toEqual({
      NEW: 2,
      DISCUSSING: 1,
      CONTRACT: 1,
      WORK: 0,
      ACCEPTANCE: 1,
      COMPLETED: 1,
    });
  });
});

describe("countOpenRequests", () => {
  it("суммирует все шаги кроме завершённых", () => {
    expect(
      countOpenRequests({
        NEW: 1,
        DISCUSSING: 0,
        CONTRACT: 2,
        WORK: 0,
        ACCEPTANCE: 0,
        COMPLETED: 3,
      }),
    ).toBe(3);
  });
});

describe("filterRequestsByStage", () => {
  const requests = [
    { id: "new", status: "NEW" as const, lockedAt: null },
    { id: "talk", status: "TERMS_AGREED" as const, lockedAt: null },
    { id: "deal", status: "DISCUSSING" as const, lockedAt: LOCKED_AT },
    { id: "done", status: "COMPLETED" as const, lockedAt: LOCKED_AT },
  ];

  it("без фильтра возвращает все заявки панели", () => {
    expect(filterRequestsByStage(requests, null).map((item) => item.id)).toEqual(["new", "talk", "deal", "done"]);
  });

  it("оставляет только выбранный шаг", () => {
    expect(filterRequestsByStage(requests, "CONTRACT").map((item) => item.id)).toEqual(["deal"]);
    expect(filterRequestsByStage(requests, "DISCUSSING").map((item) => item.id)).toEqual(["talk"]);
    expect(filterRequestsByStage(requests, "WORK")).toEqual([]);
  });
});

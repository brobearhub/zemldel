import { describe, expect, it } from "vitest";
import type { RequestStatus } from "@/entities/request";
import { groupOpenRequestsByService, selectOpenFreeRequests } from "./group-service-requests";

type ServiceStub = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type RequestStub = {
  id: string;
  serviceId: string | null;
  status: RequestStatus;
  createdAt: string;
};

function service(id: string, status: ServiceStub["status"] = "PUBLISHED"): ServiceStub {
  return { id, title: id, status };
}

function request(
  id: string,
  serviceId: string | null,
  status: RequestStatus,
  createdAt: string,
): RequestStub {
  return { id, serviceId, status, createdAt };
}

describe("groupOpenRequestsByService", () => {
  const services = [service("power"), service("house", "DRAFT"), service("old", "ARCHIVED")];

  const requests = [
    request("newer", "power", "NEW", "2026-10-06T10:00:00.000Z"),
    request("older", "power", "ACTIVE", "2026-10-03T10:00:00.000Z"),
    request("done", "power", "COMPLETED", "2026-10-07T10:00:00.000Z"),
    request("cancelled", "power", "CANCELLED", "2026-10-07T11:00:00.000Z"),
    request("closed", "power", "CLOSED", "2026-10-07T12:00:00.000Z"),
    request("draft-service", "house", "DISCUSSING", "2026-10-04T10:00:00.000Z"),
    request("archived-service", "old", "NEW", "2026-10-05T10:00:00.000Z"),
    request("freeform", null, "NEW", "2026-10-05T10:00:00.000Z"),
    request("foreign", "someone-else", "NEW", "2026-10-05T10:00:00.000Z"),
  ];

  const groups = groupOpenRequestsByService(services, requests);

  it("оставляет черновики и опубликованные услуги и убирает архив", () => {
    expect(groups.map((group) => group.service.id)).toEqual(["power", "house"]);
  });

  it("кладёт к услуге её заявки шести шагов, включая завершённые, новые сверху", () => {
    expect(groups[0]?.requests.map((item) => item.id)).toEqual(["done", "newer", "older"]);
    expect(groups[1]?.requests.map((item) => item.id)).toEqual(["draft-service"]);
  });

  it("даёт пустой список, если открытых заявок по услуге нет", () => {
    const [only] = groupOpenRequestsByService([service("quiet")], []);
    expect(only?.requests).toEqual([]);
  });
});

describe("selectOpenFreeRequests", () => {
  it("оставляет заявки без услуги, включая завершённые, новые сверху", () => {
    const selected = selectOpenFreeRequests([
      request("older", null, "DISCUSSING", "2026-10-04T10:00:00.000Z"),
      request("newer", null, "NEW", "2026-10-06T10:00:00.000Z"),
      request("done", null, "COMPLETED", "2026-10-07T10:00:00.000Z"),
      request("cancelled", null, "CANCELLED", "2026-10-07T11:00:00.000Z"),
      request("closed", null, "CLOSED", "2026-10-07T12:00:00.000Z"),
      request("bound", "power", "NEW", "2026-10-08T10:00:00.000Z"),
    ]);

    expect(selected.map((item) => item.id)).toEqual(["done", "newer", "older"]);
  });
});

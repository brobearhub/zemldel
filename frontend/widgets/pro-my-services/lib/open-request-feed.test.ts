import { describe, expect, it } from "vitest";
import type { RequestProDto } from "@/entities/request";
import { withoutCompletedRequests } from "./open-request-feed";

function row(status: RequestProDto["status"]): RequestProDto {
  return { id: status, status } as RequestProDto;
}

describe("withoutCompletedRequests", () => {
  it("убирает завершённые заявки", () => {
    const items = [row("NEW"), row("COMPLETED"), row("DISCUSSING")];

    expect(withoutCompletedRequests(items).map((item) => item.status)).toEqual(["NEW", "DISCUSSING"]);
  });
});

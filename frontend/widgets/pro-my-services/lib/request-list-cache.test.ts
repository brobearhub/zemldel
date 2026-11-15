import { describe, expect, it, beforeEach } from "vitest";
import type { RequestProDto } from "@/entities/request";
import {
  REQUEST_LIST_CACHE_TTL_MS,
  clearRequestListCache,
  readRequestListCache,
  writeRequestListCache,
  invalidateRequestListCache,
} from "./request-list-cache";

const NOW = Date.parse("2026-10-08T12:00:00.000Z");

function row(id: string): RequestProDto {
  return { id } as RequestProDto;
}

describe("request list cache", () => {
  beforeEach(() => {
    clearRequestListCache();
  });

  it("отдаёт список той же услуги, пока не прошло 10 минут", () => {
    writeRequestListCache({ serviceId: "svc" }, { items: [row("a")], total: 4, needsReply: 4, hasMore: true, nextCursor: "next" }, NOW);

    expect(readRequestListCache({ serviceId: "svc" }, NOW + REQUEST_LIST_CACHE_TTL_MS - 1)?.items.map((item) => item.id)).toEqual(["a"]);
    expect(readRequestListCache({ serviceId: "other" }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: null }, NOW)).toBeNull();
  });

  it("забывает запись через 10 минут", () => {
    writeRequestListCache({ serviceId: null }, { items: [row("free")], total: 1, needsReply: 1, hasMore: false, nextCursor: null }, NOW);

    expect(readRequestListCache({ serviceId: null }, NOW + REQUEST_LIST_CACHE_TTL_MS)).toBeNull();
  });

  it("разделяет страницы и поиск и сбрасывает все страницы изменившейся услуги", () => {
    const feed = { items: [row("a")], total: 4, needsReply: 4, hasMore: true, nextCursor: "next" };
    writeRequestListCache({ serviceId: "svc" }, feed, NOW);
    expect(readRequestListCache({ serviceId: "svc", limit: 3 }, NOW)).toEqual(feed);
    expect(readRequestListCache({ serviceId: "svc", cursor: "next", limit: 5 }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: "svc", search: "Иван" }, NOW)).toBeNull();
    writeRequestListCache({ serviceId: "svc", search: "Иван" }, feed, NOW);
    writeRequestListCache({ serviceId: "svc", cursor: "next", limit: 5 }, feed, NOW);
    writeRequestListCache({ serviceId: null }, feed, NOW);
    invalidateRequestListCache({ serviceId: "svc" });
    expect(readRequestListCache({ serviceId: "svc" }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: "svc", search: "Иван" }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: "svc", cursor: "next", limit: 5 }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: null }, NOW)).toEqual(feed);
  });
});

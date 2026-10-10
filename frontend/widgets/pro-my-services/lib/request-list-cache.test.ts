import { describe, expect, it, beforeEach } from "vitest";
import type { RequestProDto } from "@/entities/request";
import {
  REQUEST_LIST_CACHE_TTL_MS,
  clearRequestListCache,
  readRequestListCache,
  writeRequestListCache,
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
    writeRequestListCache({ serviceId: "svc" }, [row("a")], NOW);

    expect(readRequestListCache({ serviceId: "svc" }, NOW + REQUEST_LIST_CACHE_TTL_MS - 1)?.map((item) => item.id)).toEqual(["a"]);
    expect(readRequestListCache({ serviceId: "other" }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: null }, NOW)).toBeNull();
  });

  it("забывает запись через 10 минут", () => {
    writeRequestListCache({ serviceId: null }, [row("free")], NOW);

    expect(readRequestListCache({ serviceId: null }, NOW + REQUEST_LIST_CACHE_TTL_MS)).toBeNull();
  });
});

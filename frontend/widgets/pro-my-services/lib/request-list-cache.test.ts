import { describe, expect, it, beforeEach } from "vitest";
import type { RequestProDto } from "@/entities/request";
import {
  REQUEST_LIST_CACHE_TTL_MS,
  clearRequestListCache,
  emptyRequestListStageCounts,
  readCachedStageCounts,
  readRequestListCache,
  writeRequestListCache,
} from "./request-list-cache";

const NOW = Date.parse("2026-10-08T12:00:00.000Z");

function row(id: string): RequestProDto {
  return { id } as RequestProDto;
}

const counts = { ...emptyRequestListStageCounts(), NEW: 2, CONTRACT: 1 };

describe("request list cache", () => {
  beforeEach(() => {
    clearRequestListCache();
  });

  it("отдаёт запись того же шага и услуги, пока не прошло 10 минут", () => {
    writeRequestListCache({ serviceId: "svc", stage: "NEW" }, [row("a")], counts, NOW);

    expect(readRequestListCache({ serviceId: "svc", stage: "NEW" }, NOW + REQUEST_LIST_CACHE_TTL_MS - 1)?.map((item) => item.id)).toEqual(["a"]);
    expect(readRequestListCache({ serviceId: "svc", stage: "WORK" }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: "other", stage: "NEW" }, NOW)).toBeNull();
    expect(readRequestListCache({ serviceId: null, stage: "NEW" }, NOW)).toBeNull();
  });

  it("хранит счётчики всех шагов отдельно от списка одного фильтра", () => {
    writeRequestListCache({ serviceId: "svc", stage: "NEW" }, [row("a")], counts, NOW);

    expect(readCachedStageCounts("svc", NOW)).toEqual(counts);
    expect(readCachedStageCounts("svc", NOW + REQUEST_LIST_CACHE_TTL_MS)).toBeNull();
  });

  it("забывает запись через 10 минут", () => {
    writeRequestListCache({ serviceId: null, stage: "DISCUSSING" }, [row("free")], counts, NOW);

    expect(readRequestListCache({ serviceId: null, stage: "DISCUSSING" }, NOW + REQUEST_LIST_CACHE_TTL_MS)).toBeNull();
  });
});

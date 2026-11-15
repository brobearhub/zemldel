import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRequestList } from "./fetch-request-list";
import { clearRequestListCache, readRequestListCache } from "./request-list-cache";
import {
  clearRequestFeedRateLimit,
  getRequestFeedRetrySeconds,
  RequestFeedRateLimitError,
} from "./request-feed-rate-limit";

describe("request feed rate limit feedback", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearRequestListCache();
    clearRequestFeedRateLimit();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    clearRequestFeedRateLimit();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows Retry-After in Russian and does not cache or retry a blocked page", async () => {
    fetchMock.mockResolvedValue(Response.json(
      { statusCode: 429, message: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": "10" } },
    ));

    await expect(fetchRequestList({ serviceId: null })).rejects.toBeInstanceOf(RequestFeedRateLimitError);
    expect(getRequestFeedRetrySeconds()).toBe(10);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readRequestListCache({ serviceId: null })).toBeNull();
  });

  it.each([undefined, "invalid", "-1"])(
    "shows a useful fallback when Retry-After is %s",
    async (retryAfter) => {
      fetchMock.mockResolvedValue(Response.json({}, {
        status: 429,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      }));

      await expect(fetchRequestList({ serviceId: "service" })).rejects.toBeInstanceOf(RequestFeedRateLimitError);
      expect(getRequestFeedRetrySeconds()).toBe(60);
    },
  );

  it("pauses requests across services, search and free requests until the server deadline", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    fetchMock.mockResolvedValueOnce(Response.json({}, {
      status: 429,
      headers: { "Retry-After": "10" },
    })).mockResolvedValueOnce(Response.json({
      items: [], total: 0, needsReply: 0, hasMore: false, nextCursor: null,
    }));

    await expect(fetchRequestList({ serviceId: "one" })).rejects.toBeInstanceOf(RequestFeedRateLimitError);
    now += 5_000;
    await expect(fetchRequestList({ serviceId: null }, now, true)).rejects.toBeInstanceOf(RequestFeedRateLimitError);
    await expect(fetchRequestList({ serviceId: "two", search: "Иван", cursor: "next" }, now, true)).rejects.toBeInstanceOf(RequestFeedRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getRequestFeedRetrySeconds()).toBe(5);

    now += 5_000;
    await expect(fetchRequestList({ serviceId: null }, now, true)).resolves.toMatchObject({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it } from "vitest";
import { isBackendOutageError } from "./is-backend-outage-error";

describe("isBackendOutageError", () => {
  it("detects backend 5xx messages", () => {
    expect(isBackendOutageError(new Error("Backend request failed with status 500"))).toBe(true);
    expect(
      isBackendOutageError(new Error("Backend request failed with status 503: Service Unavailable")),
    ).toBe(true);
  });

  it("detects network/timeout markers", () => {
    expect(isBackendOutageError(new Error("connect ECONNREFUSED 127.0.0.1:3003"))).toBe(true);
    expect(isBackendOutageError(new Error("timeout of 15000ms exceeded"))).toBe(true);
    expect(isBackendOutageError(new Error("Network Error"))).toBe(true);
  });

  it("ignores client and not-found errors", () => {
    expect(isBackendOutageError(new Error("Backend request failed with status 404"))).toBe(false);
    expect(isBackendOutageError(new Error("Backend request failed with status 403: Forbidden"))).toBe(
      false,
    );
    expect(isBackendOutageError(new Error("Something broke in the UI"))).toBe(false);
    expect(isBackendOutageError(null)).toBe(false);
  });
});

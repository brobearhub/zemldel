import { afterEach, describe, expect, it } from "vitest";
import {
  getPreviousInternalHref,
  INTERNAL_NAV_CURR_KEY,
  INTERNAL_NAV_PREV_KEY,
  rememberInternalNav,
} from "./internal-nav-history";

afterEach(() => {
  sessionStorage.clear();
});

describe("rememberInternalNav", () => {
  it("does not invent a previous route on the first page", () => {
    rememberInternalNav("/");
    expect(sessionStorage.getItem(INTERNAL_NAV_CURR_KEY)).toBe("/");
    expect(getPreviousInternalHref()).toBeNull();
  });

  it("stores the previous internal path after a navigation", () => {
    rememberInternalNav("/");
    rememberInternalNav("/services/abc");
    expect(getPreviousInternalHref()).toBe("/");
    expect(sessionStorage.getItem(INTERNAL_NAV_CURR_KEY)).toBe("/services/abc");
  });

  it("does not overwrite prev when the current path is unchanged", () => {
    rememberInternalNav("/");
    rememberInternalNav("/services/abc");
    rememberInternalNav("/services/abc");
    expect(getPreviousInternalHref()).toBe("/");
  });

  it("ignores non-internal previous values", () => {
    sessionStorage.setItem(INTERNAL_NAV_PREV_KEY, "https://example.com");
    expect(getPreviousInternalHref()).toBeNull();
  });
});

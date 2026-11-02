import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisibleRefresh } from "./use-visible-refresh";

describe("visible request refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it("refreshes on mount and focus without polling", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useVisibleRefresh({ scope: "request-a", onRefresh: load }));
    expect(load).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent socket and focus updates", async () => {
    const load = vi.fn(() => new Promise<void>(() => {}));
    const { result } = renderHook(() => useVisibleRefresh({ scope: "a", onRefresh: load }));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      result.current();
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("aborts when hidden and refreshes immediately when visible again", async () => {
    const signals: AbortSignal[] = [];
    const load = vi.fn(async (signal: AbortSignal) => { signals.push(signal); });
    renderHook(() => useVisibleRefresh({ scope: "a", onRefresh: load }));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(signals[0].aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(load).toHaveBeenCalledTimes(1);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("invalidates reads during a mutation, a scope change and unmount", async () => {
    const signals: AbortSignal[] = [];
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<void>(() => {});
    });
    const { rerender, unmount } = renderHook(
      ({ scope, paused }) => useVisibleRefresh({ scope, paused, onRefresh: load }),
      { initialProps: { scope: "provider-a", paused: false } },
    );
    rerender({ scope: "provider-a", paused: true });
    expect(signals[0].aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(load).toHaveBeenCalledTimes(1);
    rerender({ scope: "provider-a", paused: false });
    rerender({ scope: "archived", paused: false });
    expect(signals[1].aborted).toBe(true);
    unmount();
    expect(signals[2].aborted).toBe(true);
  });

  it("retries after a network error and uses the latest callback", async () => {
    const first = vi.fn().mockRejectedValue(new Error("offline"));
    const next = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ load }) => useVisibleRefresh({ scope: "a", onRefresh: load }),
      { initialProps: { load: first } },
    );
    await act(async () => {});
    rerender({ load: next });
    await act(async () => { window.dispatchEvent(new Event("request:sync")); });
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("filters unrelated requests and queues invalidation received during a read", async () => {
    let finish!: () => void;
    const load = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useVisibleRefresh({scope: "a", requestId: "a", onRefresh: load}));
    await act(async () => {window.dispatchEvent(new CustomEvent("request:changed", {detail: {requestId: "b"}}));});
    finish();
    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(1);
    let finishSecond!: () => void;
    load.mockImplementationOnce(() => new Promise<void>(resolve => { finishSecond = resolve; }));
    await act(async () => {window.dispatchEvent(new CustomEvent("request:changed", {detail: {requestId: "a"}}));});
    await act(async () => {window.dispatchEvent(new CustomEvent("request:changed", {detail: {requestId: "a"}}));});
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => {finishSecond();});
    expect(load).toHaveBeenCalledTimes(3);
    unmount();
    window.dispatchEvent(new Event("request:sync"));
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("resynchronizes on reconnect and schedules only one deadline read", async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useVisibleRefresh({scope: "a", requestId: "a", onRefresh: load,
      refreshAt: new Date(Date.now() + 7000).toISOString()}));
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(load).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(load).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => {window.dispatchEvent(new Event("request:sync"));});
    expect(load).toHaveBeenCalledTimes(3);
    await act(async () => {window.dispatchEvent(new Event("online"));});
    expect(load).toHaveBeenCalledTimes(4);
  });

});

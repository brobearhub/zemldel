"use client";

import { useCallback, useEffect, useRef } from "react";

/** Refresh only the visible view. Scope changes and mutations invalidate old responses. */
export function useVisibleRefresh({
  onRefresh,
  scope,
  paused = false,
  requestId,
  refreshAt,
}: {
  onRefresh: (signal: AbortSignal) => Promise<void>;
  scope: string;
  paused?: boolean;
  requestId?: string;
  refreshAt?: string | null;
}) {
  const callback = useRef(onRefresh);
  const trigger = useRef<() => void>(() => {});
  useEffect(() => { callback.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (paused) return;
    let controller: AbortController | null = null;
    let pending = false;
    let disposed = false;
    const refresh = () => {
      if (disposed || document.visibilityState !== "visible") return;
      if (controller) { pending = true; return; }
      const current = new AbortController();
      controller = current;
      void callback.current(current.signal).catch(() => {
        // Preserve the usable view; reconnect, focus or another event retries.
      }).finally(() => {
        if (controller === current) {
          controller = null;
          if (pending) { pending = false; refresh(); }
        }
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
      else {
        controller?.abort();
        controller = null;
      }
    };
    const onChanged = (event: Event) => {
      if ((event as CustomEvent<{ requestId: string }>).detail?.requestId === requestId) refresh();
    };
    trigger.current = refresh;
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("request:changed", onChanged);
    window.addEventListener("request:sync", refresh);
    window.addEventListener("online", refresh);
    // Auto-acceptance is calculated by the API on read: refresh once at its deadline.
    const delay = refreshAt ? Date.parse(refreshAt) - Date.now() : NaN;
    const deadline = delay > 0 ? window.setTimeout(refresh, delay) : undefined;
    // Also recover immediately after a local mutation or a scope change.
    refresh();
    return () => {
      disposed = true;
      trigger.current = () => {};
      controller?.abort();
      window.removeEventListener("request:changed", onChanged);
      window.removeEventListener("request:sync", refresh);
      window.removeEventListener("online", refresh);
      window.clearTimeout(deadline);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [scope, paused, requestId, refreshAt]);

  return useCallback(() => trigger.current(), []);
}

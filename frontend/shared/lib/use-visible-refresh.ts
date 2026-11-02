"use client";

import { useCallback, useEffect, useRef } from "react";

/** Refresh only the visible view. Scope changes and mutations invalidate old responses. */
export function useVisibleRefresh({
  onRefresh,
  scope,
  paused = false,
  intervalMs = 5000,
}: {
  onRefresh: (signal: AbortSignal) => Promise<void>;
  scope: string;
  paused?: boolean;
  intervalMs?: number;
}) {
  const callback = useRef(onRefresh);
  const trigger = useRef<() => void>(() => {});
  useEffect(() => { callback.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (paused) return;
    let controller: AbortController | null = null;
    const refresh = () => {
      if (controller || document.visibilityState !== "visible") return;
      const current = new AbortController();
      controller = current;
      void callback.current(current.signal).catch(() => {
        // Preserve the usable view on transient errors; retry on focus or the next tick.
      }).finally(() => {
        if (controller === current) controller = null;
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
      else {
        controller?.abort();
        controller = null;
      }
    };
    trigger.current = refresh;
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(refresh, intervalMs);
    // Also recover immediately after a local mutation or a scope change.
    refresh();
    return () => {
      trigger.current = () => {};
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [scope, paused, intervalMs]);

  return useCallback(() => trigger.current(), []);
}

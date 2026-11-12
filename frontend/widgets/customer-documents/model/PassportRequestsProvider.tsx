"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveAccountKind } from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { PASSPORT_REQUESTS_CHANGED, passportAccessUrl, type PassportAccessRequest } from "./passport-access";

const Context = createContext(false);
const isVisible = () => document.visibilityState !== "hidden";

/** Invalidation uses the existing request socket; polling also recovers missed events. */
export function PassportRequestsProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAppSelector((state) => state.auth);
  const userId = status === "authenticated" && resolveAccountKind(user) === "CUSTOMER" ? user?.id : null;
  const [result, setResult] = useState<{ userId: string; pending: boolean } | null>(null);

  useEffect(() => {
    setResult(null);
    if (!userId) return;
    let disposed = false;
    let controller: AbortController | undefined;
    let queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      clearTimeout(timer);
      if (disposed || !isVisible()) return;
      if (controller) {
        queued = true;
        return;
      }
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch(`${passportAccessUrl}/requests`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { requests?: PassportAccessRequest[] };
        if (!disposed && Array.isArray(data.requests)) setResult({ userId: userId!, pending: data.requests.length > 0 });
      } catch {
        // Keep the last known pending state until a successful refresh.
      } finally {
        clearTimeout(timeout);
        controller = undefined;
        if (!disposed) {
          if (queued) {
            queued = false;
            void refresh();
          } else if (isVisible()) timer = setTimeout(() => void refresh(), 60_000);
        }
      }
    }
    const onChange = () => { void refresh(); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        controller?.abort();
      } else void refresh();
    };
    void refresh();
    const events = [PASSPORT_REQUESTS_CHANGED, "request:changed", "request:sync", "focus", "online"];
    for (const event of events) window.addEventListener(event, onChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      for (const event of events) window.removeEventListener(event, onChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);

  return <Context.Provider value={Boolean(userId && result?.userId === userId && result.pending)}>{children}</Context.Provider>;
}

export function usePassportRequestsPending() {
  return useContext(Context);
}

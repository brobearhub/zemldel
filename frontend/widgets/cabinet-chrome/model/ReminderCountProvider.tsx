"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getActiveMembership,
  resolveAccountKind,
} from "@/core/auth/authorization";
import { useAppSelector } from "@/core/store/hooks";
import { breakpointValues } from "@/core/theme/breakpoints";
import {
  REMINDERS_CHANGED_EVENT,
  REMINDER_COUNT_REQUESTED_EVENT,
} from "@/entities/request/lib/reminder-events";

const Context = createContext(0);
const POLL_INTERVAL_MS = 15 * 60_000;
const isVisible = () => document.visibilityState !== "hidden";

export function ReminderCountProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAppSelector((state) => state.auth);
  const providerId = getActiveMembership(user)?.providerId;
  const scope =
    status === "authenticated" &&
    resolveAccountKind(user) === "PROVIDER" &&
    providerId &&
    getActiveMembership(user)?.role !== "EMPLOYEE"
      ? `${user?.id}:${providerId}`
      : null;
  const [result, setResult] = useState<{ scope: string; count: number } | null>(
    null,
  );

  useEffect(() => {
    setResult(null);
    if (!scope) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let queued = false;
    let lastAttemptAt: number | null = null;
    const desktop = window.matchMedia(
      `(min-width: ${breakpointValues.tablet}px)`,
    );

    function scheduleDesktopRefresh() {
      clearTimeout(timer);
      if (disposed || !desktop.matches || !isVisible()) return;
      const remaining =
        lastAttemptAt === null
          ? 0
          : POLL_INTERVAL_MS - (Date.now() - lastAttemptAt);
      if (remaining <= 0) {
        void refresh();
      } else {
        timer = setTimeout(() => void refresh(), remaining);
      }
    }

    const refresh = async () => {
      clearTimeout(timer);
      if (disposed || !isVisible()) return;
      if (controller) {
        queued = true;
        return;
      }
      controller = new AbortController();
      lastAttemptAt = Date.now();
      const requestController = controller;
      const timeout = setTimeout(() => requestController.abort(), 10_000);
      try {
        const response = await fetch("/api/pro/reminders/upcoming-count", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: { count?: unknown } = await response.json();
        if (
          !disposed &&
          typeof data.count === "number" &&
          Number.isSafeInteger(data.count) &&
          data.count >= 0
        ) {
          setResult({ scope, count: data.count });
        }
      } catch {
        // Retry at the next desktop interval or explicit mobile menu opening.
      } finally {
        clearTimeout(timeout);
        controller = undefined;
        if (!disposed && isVisible()) {
          if (queued) {
            queued = false;
            void refresh();
          } else {
            scheduleDesktopRefresh();
          }
        }
      }
    };
    const onRefresh = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        queued = false;
        controller?.abort();
      } else {
        scheduleDesktopRefresh();
      }
    };
    scheduleDesktopRefresh();
    desktop.addEventListener("change", scheduleDesktopRefresh);
    window.addEventListener("focus", scheduleDesktopRefresh);
    window.addEventListener("online", scheduleDesktopRefresh);
    window.addEventListener(REMINDERS_CHANGED_EVENT, onRefresh);
    window.addEventListener(REMINDER_COUNT_REQUESTED_EVENT, onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      desktop.removeEventListener("change", scheduleDesktopRefresh);
      window.removeEventListener("focus", scheduleDesktopRefresh);
      window.removeEventListener("online", scheduleDesktopRefresh);
      window.removeEventListener(REMINDERS_CHANGED_EVENT, onRefresh);
      window.removeEventListener(REMINDER_COUNT_REQUESTED_EVENT, onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scope]);

  return (
    <Context.Provider
      value={scope && result?.scope === scope ? result.count : 0}
    >
      {children}
    </Context.Provider>
  );
}

export function useReminderCount() {
  return useContext(Context);
}

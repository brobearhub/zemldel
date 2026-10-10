"use client";

import { getSession } from "next-auth/react";
import { createSessionRecoveryFetch } from "./session-recovery";

const RECOVERY_MARK = "__sessionRecovery";

type MarkedFetch = typeof fetch & { [RECOVERY_MARK]?: boolean };

function ensureSessionRecoveryInstalled() {
  const current = window.fetch as MarkedFetch;
  if (current[RECOVERY_MARK]) return;

  const original = window.fetch.bind(window);
  const recovered = createSessionRecoveryFetch({
    fetch: original,
    getSession: () => getSession(),
    pathname: () => window.location.pathname,
    returnTo: () => window.location.pathname + window.location.search,
    origin: () => window.location.origin,
    redirect: (href) => {
      window.location.assign(href);
    },
  }) as MarkedFetch;
  recovered[RECOVERY_MARK] = true;
  window.fetch = recovered;
}

/**
 * Ставит декоратор fetch до эффектов детей.
 * Why: общего API-клиента нет, а useEffect родителя срабатывает позже запросов виджетов.
 */
export function SessionRecovery() {
  if (typeof window !== "undefined") {
    ensureSessionRecoveryInstalled();
  }
  return null;
}

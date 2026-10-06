export const INTERNAL_NAV_CURR_KEY = "zemledel.nav.curr";
export const INTERNAL_NAV_PREV_KEY = "zemledel.nav.prev";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/**
 * Why: `document.referrer` не обновляется при client-side навигации Next.js.
 * Пишем синхронно при смене маршрута, чтобы кнопка «Назад» читала уже актуальный prev.
 */
export function rememberInternalNav(currPath: string): void {
  if (!canUseSessionStorage()) return;
  try {
    const prevCurr = sessionStorage.getItem(INTERNAL_NAV_CURR_KEY);
    if (prevCurr && prevCurr !== currPath) {
      sessionStorage.setItem(INTERNAL_NAV_PREV_KEY, prevCurr);
    }
    sessionStorage.setItem(INTERNAL_NAV_CURR_KEY, currPath);
  } catch {
    // sessionStorage может быть недоступен (iframe / private mode)
  }
}

export function getPreviousInternalHref(): string | null {
  if (!canUseSessionStorage()) return null;
  try {
    const prev = sessionStorage.getItem(INTERNAL_NAV_PREV_KEY);
    if (prev && prev.startsWith("/")) return prev;
  } catch {
    return null;
  }
  return null;
}

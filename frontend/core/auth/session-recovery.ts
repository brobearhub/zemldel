/** Сколько раз обновляем сессию, прежде чем увести на вход. */
export const SESSION_RECOVERY_ATTEMPTS = 3;

/** Пауза между повторными обновлениями, чтобы короткий сбой бэкенда успел пройти. */
export const SESSION_RECOVERY_PAUSE_MS = 300;

export type RecoveryStep = "refresh" | "redirect" | "surface";

const AUTH_PAGE_PREFIXES = ["/signin", "/signup"] as const;

export function isSafeReturnToPath(value: string | null): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  return true;
}

export function buildSignInHref(returnTo: string): string {
  const safe = isSafeReturnToPath(returnTo) ? returnTo : "/";
  return `/signin?returnTo=${encodeURIComponent(safe)}`;
}

export function shouldLeaveForSignIn(pathname: string): boolean {
  return !AUTH_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * completedAttempts — сколько общих обновлений сессии уже было в этом инциденте.
 * Пока лимит не выбран, запрос повторяем. Дальше уходим на вход, кроме страниц логина и регистрации.
 */
export function nextRecoveryStep(completedAttempts: number, pathname: string): RecoveryStep {
  if (completedAttempts < SESSION_RECOVERY_ATTEMPTS) return "refresh";
  if (shouldLeaveForSignIn(pathname)) return "redirect";
  return "surface";
}

export function isSessionRecoveryUrl(input: string, currentOrigin?: string): boolean {
  let url: URL;
  try {
    url = new URL(input, currentOrigin ?? "http://local.invalid");
  } catch {
    return false;
  }

  if (/^https?:\/\//i.test(input)) {
    if (!currentOrigin || url.origin !== currentOrigin) return false;
  }

  const { pathname } = url;
  if (!pathname.startsWith("/api/")) return false;
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return false;
  return true;
}

export function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

type SessionLookup = () => Promise<unknown>;

export type SessionRecoveryDeps = {
  fetch: typeof fetch;
  getSession: SessionLookup;
  pathname: () => string;
  returnTo: () => string;
  origin: () => string;
  redirect: (href: string) => void;
  pause?: (ms: number) => Promise<void>;
};

/**
 * Декоратор над fetch: 401 на своих /api (кроме /api/auth) обновляет сессию и повторяет запрос.
 * Параллельные 401 делят одно обновление, чтобы не сжечь лимит по числу виджетов.
 */
export function createSessionRecoveryFetch(deps: SessionRecoveryDeps): typeof fetch {
  let completedAttempts = 0;
  let refreshInFlight: Promise<void> | null = null;
  let redirecting = false;
  const pause = deps.pause ?? defaultPause;

  async function refreshOnce(): Promise<void> {
    if (refreshInFlight) return refreshInFlight;

    const attempt = completedAttempts + 1;
    completedAttempts = attempt;
    refreshInFlight = (async () => {
      if (attempt > 1) await pause(SESSION_RECOVERY_PAUSE_MS);
      try {
        await deps.getSession();
      } catch {
        // Неуспешное обновление тоже тратит попытку.
      }
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  }

  function leaveForSignIn() {
    if (redirecting) return;
    if (!shouldLeaveForSignIn(deps.pathname())) return;
    redirecting = true;
    deps.redirect(buildSignInHref(deps.returnTo()));
  }

  const recovered: typeof fetch = async (input, init) => {
    const url = resolveRequestUrl(input);
    const recoverable = isSessionRecoveryUrl(url, deps.origin());
    const firstInput = recoverable && input instanceof Request ? input.clone() : input;
    const first = await deps.fetch(firstInput, init);

    if (!recoverable || first.status !== 401) return first;

    let last = first;
    for (;;) {
      const step = nextRecoveryStep(completedAttempts, deps.pathname());
      if (step === "redirect") {
        leaveForSignIn();
        return last;
      }
      if (step === "surface") return last;

      await refreshOnce();
      const retryInput = input instanceof Request ? input.clone() : input;
      last = await deps.fetch(retryInput, init);
      if (last.status !== 401) {
        completedAttempts = 0;
        return last;
      }
    }
  };

  return recovered;
}

function defaultPause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

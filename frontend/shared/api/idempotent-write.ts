"use client";

// Keep one intent through a lost response, a remount or reauthentication.
// A new intent is allocated only after an acknowledged success or changed input.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, v]) => key !== "operationId" && v != null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
type WriteIntent = { fingerprint: string; id: string; resultId?: string };
const volatile = new Map<string, WriteIntent>();
function read(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw) as WriteIntent;
  } catch {
    /* storage may be disabled */
  }
  return volatile.get(key);
}
export async function fetchIdempotentWrite(
  url: string,
  init: RequestInit,
  options?: {
    retainUntilComplete?: boolean;
    recover?: () => Promise<Response | null>;
  },
): Promise<Response> {
  if (init.method?.toUpperCase() !== "POST") return fetch(url, init);
  const key = `pending-write:${url}`;
  const form = init.body instanceof FormData ? init.body : null;
  const body = form
    ? null
    : (JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>);
  const fingerprint = JSON.stringify(
    form
      ? [...form.entries()]
          .filter(([key]) => key !== "operationId")
          .map(([key, value]) => [
            key,
            typeof value === "string"
              ? value
              : [value.name, value.type, value.size, value.lastModified],
          ])
      : canonical(body),
  );
  const old = read(key);
  const operation: WriteIntent =
    old?.fingerprint === fingerprint
      ? old
      : { fingerprint, id: crypto.randomUUID() };
  volatile.set(key, operation);
  try {
    sessionStorage.setItem(key, JSON.stringify(operation));
  } catch {
    /* in-memory retry remains available */
  }
  if (form) form.set("operationId", operation.id);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      body: form ?? JSON.stringify({ ...body, operationId: operation.id }),
    });
  } catch {
    const confirmed = await options?.recover?.().catch(() => null);
    if (!confirmed)
      throw new Error(
        "Ответ сервера не получен. Проверьте соединение и повторите отправку.",
      );
    response = confirmed;
  }
  if (response.status === 409) {
    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as { message?: unknown } | null;
    if (typeof payload?.message === "string")
      return new Response(JSON.stringify({ error: payload.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
  }
  // Keep the key on transport errors, non-2xx or incomplete/malformed response bodies.
  const payload = response.ok
    ? ((await response
        .clone()
        .json()
        .catch(() => null)) as {
        id?: string;
        bundleId?: string;
        payments?: unknown;
        ok?: boolean;
      } | null)
    : null;
  const acknowledged =
    payload &&
    (typeof payload.id === "string" ||
      typeof payload.bundleId === "string" ||
      Array.isArray(payload.payments) ||
      payload.ok === true);
  if (acknowledged && read(key)?.id === operation.id) {
    if (options?.retainUntilComplete) {
      operation.resultId = payload.id;
      volatile.set(key, operation);
      try {
        sessionStorage.setItem(key, JSON.stringify(operation));
      } catch {
        /* in-memory continuation */
      }
    } else {
      volatile.delete(key);
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* nonessential cleanup */
      }
    }
  }
  return response;
}

/** SERVICE creation includes chat initialization; acknowledge only after that chain succeeds. */
export function completeWriteIntent(url: string, resourceId: string) {
  const key = `pending-write:${url}`;
  if (read(key)?.resultId !== resourceId) return;
  volatile.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* nonessential cleanup */
  }
}

/** Explicit deletion ends the previous upload intent for this resource. */
export function forgetWriteIntent(url: string) {
  const key = `pending-write:${url}`;
  volatile.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* nonessential cleanup */
  }
}

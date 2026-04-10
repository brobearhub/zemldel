"use client";

export const SERVICE_REQUEST_INTENT = "service-request";
export const SERVICE_REQUESTS_PROFILE_URL = "/profile?section=requests";
export const SERVICE_REQUESTS_PROFILE_RESUME_URL = "/profile?section=requests&requestResume=1";

const STORAGE_KEY = "pending-service-request";
const SUBMITTING_TTL_MS = 15_000;

export type PendingServiceRequestDraft =
  | {
      kind: "SERVICE";
      serviceId: string;
      customerName: string | null;
      customerEmail: string | null;
      customerPhone: string | null;
      message: string | null;
      requestCityId: string | null;
      state: "pending" | "submitting";
      updatedAt: number;
      lastError: string | null;
    }
  | {
      kind: "CATEGORY";
      categoryId: string;
      message: string | null;
      requestCityId: string | null;
      state: "pending" | "submitting";
      updatedAt: number;
      lastError: string | null;
    }
  | {
      kind: "FREEFORM";
      message: string | null;
      requestCityId: string | null;
      state: "pending" | "submitting";
      updatedAt: number;
      lastError: string | null;
    };

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function readPendingServiceRequestDraft(): PendingServiceRequestDraft | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingServiceRequestDraft> & { kind?: unknown };
    if (parsed.kind === "SERVICE") {
      if (typeof (parsed as any).serviceId !== "string" || !(parsed as any).serviceId) return null;
      return {
        kind: "SERVICE",
        serviceId: String((parsed as any).serviceId),
        customerName: normalizeNullableString((parsed as any).customerName ?? null),
        customerEmail: normalizeNullableString((parsed as any).customerEmail ?? null),
        customerPhone: normalizeNullableString((parsed as any).customerPhone ?? null),
        message: normalizeNullableString((parsed as any).message ?? null),
        requestCityId: normalizeNullableString((parsed as any).requestCityId ?? null),
        state: (parsed as any).state === "submitting" ? "submitting" : "pending",
        updatedAt: typeof (parsed as any).updatedAt === "number" ? (parsed as any).updatedAt : Date.now(),
        lastError: normalizeNullableString((parsed as any).lastError ?? null),
      };
    }
    if (parsed.kind === "CATEGORY") {
      if (typeof (parsed as any).categoryId !== "string" || !(parsed as any).categoryId) return null;
      return {
        kind: "CATEGORY",
        categoryId: String((parsed as any).categoryId),
        message: normalizeNullableString((parsed as any).message ?? null),
        requestCityId: normalizeNullableString((parsed as any).requestCityId ?? null),
        state: (parsed as any).state === "submitting" ? "submitting" : "pending",
        updatedAt: typeof (parsed as any).updatedAt === "number" ? (parsed as any).updatedAt : Date.now(),
        lastError: normalizeNullableString((parsed as any).lastError ?? null),
      };
    }
    if (parsed.kind === "FREEFORM") {
      return {
        kind: "FREEFORM",
        message: normalizeNullableString((parsed as any).message ?? null),
        requestCityId: normalizeNullableString((parsed as any).requestCityId ?? null),
        state: (parsed as any).state === "submitting" ? "submitting" : "pending",
        updatedAt: typeof (parsed as any).updatedAt === "number" ? (parsed as any).updatedAt : Date.now(),
        lastError: normalizeNullableString((parsed as any).lastError ?? null),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writePendingServiceRequestDraft(draft: PendingServiceRequestDraft) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearPendingServiceRequestDraft() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function savePendingServiceRequestDraft(
  draft:
    | Omit<
        Extract<PendingServiceRequestDraft, { kind: "SERVICE" }>,
        "state" | "updatedAt" | "lastError"
      >
    | Omit<
        Extract<PendingServiceRequestDraft, { kind: "CATEGORY" }>,
        "state" | "updatedAt" | "lastError"
      >
    | Omit<
        Extract<PendingServiceRequestDraft, { kind: "FREEFORM" }>,
        "state" | "updatedAt" | "lastError"
      >
) {
  let nextDraft: PendingServiceRequestDraft;
  if (draft.kind === "SERVICE") {
    nextDraft = {
      ...draft,
      customerName: normalizeNullableString(draft.customerName),
      customerEmail: normalizeNullableString(draft.customerEmail),
      customerPhone: normalizeNullableString(draft.customerPhone),
      message: normalizeNullableString(draft.message),
      requestCityId: normalizeNullableString(draft.requestCityId),
      state: "pending",
      updatedAt: Date.now(),
      lastError: null,
    };
  } else if (draft.kind === "CATEGORY") {
    nextDraft = {
      ...draft,
      message: normalizeNullableString(draft.message),
      requestCityId: normalizeNullableString(draft.requestCityId),
      state: "pending",
      updatedAt: Date.now(),
      lastError: null,
    };
  } else {
    nextDraft = {
      ...draft,
      message: normalizeNullableString(draft.message),
      requestCityId: normalizeNullableString(draft.requestCityId),
      state: "pending",
      updatedAt: Date.now(),
      lastError: null,
    };
  }

  writePendingServiceRequestDraft(nextDraft);
  return nextDraft;
}

export function markPendingServiceRequestSubmitting() {
  const draft = readPendingServiceRequestDraft();
  if (!draft) return null;
  const next = { ...draft, state: "submitting" as const, updatedAt: Date.now(), lastError: null };
  writePendingServiceRequestDraft(next);
  return next;
}

export function markPendingServiceRequestFailed(errorMessage: string) {
  const draft = readPendingServiceRequestDraft();
  if (!draft) return null;
  const next = { ...draft, state: "pending" as const, updatedAt: Date.now(), lastError: errorMessage };
  writePendingServiceRequestDraft(next);
  return next;
}

export function isPendingServiceRequestSubmitting(draft: PendingServiceRequestDraft | null) {
  if (!draft || draft.state !== "submitting") return false;
  return Date.now() - draft.updatedAt < SUBMITTING_TTL_MS;
}

export function buildServiceRequestAuthHref(
  mode: "signin" | "signup",
  subject:
    | { kind: "SERVICE"; serviceId: string }
    | { kind: "CATEGORY"; categoryId: string }
    | { kind: "FREEFORM" }
) {
  const url = new URL(mode === "signin" ? "/signin" : "/signup", "http://local");
  url.searchParams.set("intent", SERVICE_REQUEST_INTENT);
  if (subject.kind === "SERVICE") {
    url.searchParams.set("kind", "SERVICE");
    url.searchParams.set("serviceId", subject.serviceId);
  } else if (subject.kind === "CATEGORY") {
    url.searchParams.set("kind", "CATEGORY");
    url.searchParams.set("categoryId", subject.categoryId);
  } else {
    url.searchParams.set("kind", "FREEFORM");
  }
  url.searchParams.set("returnTo", SERVICE_REQUESTS_PROFILE_RESUME_URL);
  return `${url.pathname}${url.search}`;
}


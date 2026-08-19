"use client";

export const REQUEST_INTENT = "service-request";
export const REQUESTS_PROFILE_URL = "/profile?section=requests";
export const REQUESTS_PROFILE_RESUME_URL = "/profile?section=requests&requestResume=1";

const STORAGE_KEY = "pending-service-request";
const SUBMITTING_TTL_MS = 15_000;

export type PendingRequestDraft =
  | {
      kind: "SERVICE";
      serviceId: string;
      customerName: string | null;
      customerEmail: string | null;
      customerPhone: string | null;
      message: string | null;
      requestCityId: string | null;
      cadastralNumbers: string[];
      state: "pending" | "submitting";
      updatedAt: number;
      lastError: string | null;
    }
  | {
      kind: "CATEGORY";
      categoryId: string;
      message: string | null;
      requestCityId: string | null;
      cadastralNumbers: string[];
      state: "pending" | "submitting";
      updatedAt: number;
      lastError: string | null;
    }
  | {
      kind: "FREEFORM";
      message: string | null;
      requestCityId: string | null;
      cadastralNumbers: string[];
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

function normalizeCadastralNumbers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function readPendingRequestDraft(): PendingRequestDraft | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRequestDraft> & { kind?: unknown };
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
        cadastralNumbers: normalizeCadastralNumbers((parsed as any).cadastralNumbers),
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
        cadastralNumbers: normalizeCadastralNumbers((parsed as any).cadastralNumbers),
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
        cadastralNumbers: normalizeCadastralNumbers((parsed as any).cadastralNumbers),
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

export function writePendingRequestDraft(draft: PendingRequestDraft) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearPendingRequestDraft() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function savePendingRequestDraft(
  draft:
    | Omit<Extract<PendingRequestDraft, { kind: "SERVICE" }>, "state" | "updatedAt" | "lastError">
    | Omit<Extract<PendingRequestDraft, { kind: "CATEGORY" }>, "state" | "updatedAt" | "lastError">
    | Omit<Extract<PendingRequestDraft, { kind: "FREEFORM" }>, "state" | "updatedAt" | "lastError">
) {
  let nextDraft: PendingRequestDraft;
  if (draft.kind === "SERVICE") {
    nextDraft = {
      ...draft,
      customerName: normalizeNullableString(draft.customerName),
      customerEmail: normalizeNullableString(draft.customerEmail),
      customerPhone: normalizeNullableString(draft.customerPhone),
      message: normalizeNullableString(draft.message),
      requestCityId: normalizeNullableString(draft.requestCityId),
      cadastralNumbers: normalizeCadastralNumbers(draft.cadastralNumbers),
      state: "pending",
      updatedAt: Date.now(),
      lastError: null,
    };
  } else if (draft.kind === "CATEGORY") {
    nextDraft = {
      ...draft,
      message: normalizeNullableString(draft.message),
      requestCityId: normalizeNullableString(draft.requestCityId),
      cadastralNumbers: normalizeCadastralNumbers(draft.cadastralNumbers),
      state: "pending",
      updatedAt: Date.now(),
      lastError: null,
    };
  } else {
    nextDraft = {
      ...draft,
      message: normalizeNullableString(draft.message),
      requestCityId: normalizeNullableString(draft.requestCityId),
      cadastralNumbers: normalizeCadastralNumbers(draft.cadastralNumbers),
      state: "pending",
      updatedAt: Date.now(),
      lastError: null,
    };
  }

  writePendingRequestDraft(nextDraft);
  return nextDraft;
}

export function markPendingRequestSubmitting() {
  const draft = readPendingRequestDraft();
  if (!draft) return null;
  const next = { ...draft, state: "submitting" as const, updatedAt: Date.now(), lastError: null };
  writePendingRequestDraft(next);
  return next;
}

export function markPendingRequestFailed(errorMessage: string) {
  const draft = readPendingRequestDraft();
  if (!draft) return null;
  const next = { ...draft, state: "pending" as const, updatedAt: Date.now(), lastError: errorMessage };
  writePendingRequestDraft(next);
  return next;
}

export function isPendingRequestSubmitting(draft: PendingRequestDraft | null) {
  if (!draft || draft.state !== "submitting") return false;
  return Date.now() - draft.updatedAt < SUBMITTING_TTL_MS;
}

export function buildRequestAuthHref(
  mode: "signin" | "signup",
  subject:
    | { kind: "SERVICE"; serviceId: string }
    | { kind: "CATEGORY"; categoryId: string }
    | { kind: "FREEFORM" }
) {
  const url = new URL(mode === "signin" ? "/signin" : "/signup", "http://local");
  url.searchParams.set("intent", REQUEST_INTENT);
  if (subject.kind === "SERVICE") {
    url.searchParams.set("kind", "SERVICE");
    url.searchParams.set("serviceId", subject.serviceId);
  } else if (subject.kind === "CATEGORY") {
    url.searchParams.set("kind", "CATEGORY");
    url.searchParams.set("categoryId", subject.categoryId);
  } else {
    url.searchParams.set("kind", "FREEFORM");
  }
  url.searchParams.set("returnTo", REQUESTS_PROFILE_RESUME_URL);
  return `${url.pathname}${url.search}`;
}

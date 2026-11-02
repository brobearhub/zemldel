"use client";

import type { CitySuggestItemDto } from "@/entities/city";

export const REQUEST_INTENT = "service-request";
export const REQUESTS_PROFILE_URL = "/profile?section=requests";
export const REQUESTS_PROFILE_RESUME_URL = "/profile?section=requests&requestResume=1";

const STORAGE_KEY = "pending-service-request";
const SUBMITTING_TTL_MS = 15_000;

type PendingRequestContext = {
  draftId?: string;
  subjectTitle?: string | null;
  requestCity?: CitySuggestItemDto | null;
  createdRequestId?: string | null;
};

export type PendingRequestDraft = PendingRequestContext & (
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
    });

function readDraftContext(value: PendingRequestContext): PendingRequestContext {
  const city = value.requestCity;
  return {
    draftId: typeof value.draftId === "string" ? value.draftId : undefined,
    subjectTitle: typeof value.subjectTitle === "string" ? value.subjectTitle : null,
    requestCity: city && typeof city.id === "string" && typeof city.name === "string" &&
      typeof city.regionCode === "string" && typeof city.regionName === "string" && typeof city.displayName === "string"
      ? city : null,
    createdRequestId: typeof value.createdRequestId === "string" ? value.createdRequestId : null,
  };
}

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
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
        ...readDraftContext(parsed),
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
        ...readDraftContext(parsed),
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
        ...readDraftContext(parsed),
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
  try {
    if (!canUseStorage()) throw new Error();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    throw new Error("Не удалось сохранить заявку в этой вкладке. Разрешите хранение данных сайта и попробуйте ещё раз.");
  }
}

export function clearPendingRequestDraft(expectedDraftId?: string) {
  if (!canUseStorage()) return;
  if (expectedDraftId && readPendingRequestDraft()?.draftId !== expectedDraftId) return;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Navigation can still open a request that was created successfully. */ }
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

  nextDraft = { ...nextDraft, draftId: crypto.randomUUID() };
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

export function markPendingRequestFailed(errorMessage: string, expectedDraftId?: string) {
  const draft = readPendingRequestDraft();
  if (!draft || (expectedDraftId && draft.draftId !== expectedDraftId)) return null;
  const next = { ...draft, state: "pending" as const, updatedAt: Date.now(), lastError: errorMessage };
  writePendingRequestDraft(next);
  return next;
}

export function markPendingRequestCreated(requestId: string, expectedDraftId?: string) {
  const draft = readPendingRequestDraft();
  if (!draft || (expectedDraftId && draft.draftId !== expectedDraftId)) return;
  writePendingRequestDraft({ ...draft, createdRequestId: requestId, updatedAt: Date.now() });
}

export function getPendingRequestEditHref(draft: PendingRequestDraft) {
  const path = draft.kind === "SERVICE"
    ? `/services/${encodeURIComponent(draft.serviceId)}`
    : draft.kind === "CATEGORY"
      ? `/service-categories/${encodeURIComponent(draft.categoryId)}`
      : "/";
  return `${path}?requestDraft=1${draft.kind === "SERVICE" ? "#consultation" : ""}`;
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
    | { kind: "FREEFORM" },
  reauthenticate = false,
) {
  const url = new URL(mode === "signin" ? "/signin" : "/signup", "http://local");
  url.searchParams.set("intent", REQUEST_INTENT);
  url.searchParams.set("account", "customer");
  if (reauthenticate) url.searchParams.set("reauth", "1");
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

import "server-only";

import { randomUUID } from "node:crypto";
import type { AxiosResponse } from "axios";
import { HttpClient } from "@/shared/api/generated/backend/Api";
import { createInternalAuthTokenForUserId } from "./internal-auth";

const DEFAULT_BACKEND_BASE_URL = "http://localhost:3003";
const DEFAULT_TIMEOUT_MS = 15_000;

function getBackendBaseUrl() {
  return process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_BASE_URL;
}

function normalizeHeaderValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string").join(", ");
  return undefined;
}

function headersInitToRecord(headersInit: HeadersInit | undefined): Record<string, string> {
  if (!headersInit) return {};

  if (headersInit instanceof Headers) {
    return Object.fromEntries(headersInit.entries());
  }

  if (Array.isArray(headersInit)) {
    const result: Record<string, string> = {};
    for (const [key, value] of headersInit) result[key] = value;
    return result;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headersInit)) {
    const normalized = normalizeHeaderValue(value);
    if (normalized !== undefined) result[key] = normalized;
  }
  return result;
}

function getRequestIdFromHeaders(headers: Record<string, string>) {
  // Preserve existing request id if already provided by upstream.
  const existing =
    headers["x-request-id"] ??
    headers["X-Request-Id"] ??
    headers["x-correlation-id"] ??
    headers["X-Correlation-Id"];
  return existing && existing.trim().length > 0 ? existing : randomUUID();
}

function axiosHeadersToWebHeaders(axiosHeaders: AxiosResponse["headers"]) {
  const headers = new Headers();
  for (const [key, rawValue] of Object.entries(axiosHeaders ?? {})) {
    if (!key) continue;
    const value = normalizeHeaderValue(rawValue);
    if (value === undefined) continue;
    headers.set(key, value);
  }

  // Next/Node will handle these; forwarding can break responses.
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  return headers;
}

export type BackendFetchOptions = {
  path: string;
  init?: RequestInit;
  userId?: string;
  timeoutMs?: number;
};

export async function backendSwaggerFetch({ path, init, userId, timeoutMs }: BackendFetchOptions) {
  const initHeaders = headersInitToRecord(init?.headers);
  const requestId = getRequestIdFromHeaders(initHeaders);

  const headers: Record<string, string> = {
    ...initHeaders,
    "x-request-id": requestId,
  };

  if (userId) {
    headers["x-internal-auth"] = createInternalAuthTokenForUserId(userId);
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const body = init?.body ?? undefined;

  const http = new HttpClient({
    baseURL: getBackendBaseUrl(),
    timeout: timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers,
  });

  // We always fetch as raw bytes so callers can decide how to parse (json/text/stream).
  const axiosRes = await http.request<ArrayBuffer>({
    path,
    method,
    body,
    format: "arraybuffer",
    secure: false,
    validateStatus: () => true,
  });

  const webHeaders = axiosHeadersToWebHeaders(axiosRes.headers);
  const buffer = axiosRes.data ? new Uint8Array(axiosRes.data) : new Uint8Array();
  return new Response(buffer, { status: axiosRes.status, headers: webHeaders });
}


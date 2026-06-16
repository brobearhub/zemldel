import "server-only";

import { randomUUID } from "node:crypto";
import { Api, HttpClient } from "@/shared/api/generated/backend/Api";
import { getServerAuthSession } from "@/core/auth";
import { createInternalAuthTokenForUserId } from "./internal-auth";

const DEFAULT_BACKEND_BASE_URL = "http://localhost:3003";
const DEFAULT_TIMEOUT_MS = 15_000;

function getBackendBaseUrl() {
  return process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_BASE_URL;
}

function normalizeHeaders(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);
  return headers;
}

function getOrCreateRequestId(headers?: HeadersInit) {
  const h = normalizeHeaders(headers);
  const existing =
    h.get("x-request-id") ??
    h.get("x-correlation-id") ??
    h.get("X-Request-Id") ??
    h.get("X-Correlation-Id");
  return existing && existing.trim().length > 0 ? existing : randomUUID();
}

export type BackendApiClientOptions = {
  /**
   * When provided, requests will be authenticated as this user via `x-internal-auth`.
   * Prefer `createBackendApiClientForSession()` for typical `/api/**` handlers.
   */
  userId?: string;
  /**
   * Incoming request headers (used for request-id propagation).
   */
  requestHeaders?: HeadersInit;
  timeoutMs?: number;
};

export function createBackendApiClient(options: BackendApiClientOptions = {}) {
  const requestId = getOrCreateRequestId(options.requestHeaders);

  const http = new HttpClient<{ userId?: string }>({
    baseURL: getBackendBaseUrl(),
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: {
      "x-request-id": requestId,
    },
    secure: true,
    securityWorker: (securityData) => {
      const userId = securityData?.userId;
      if (!userId) return {};
      return {
        headers: {
          "x-internal-auth": createInternalAuthTokenForUserId(userId),
        },
      };
    },
  });

  http.setSecurityData({ userId: options.userId });
  return new Api(http);
}

/**
 * Server-only helper for Next.js Route Handlers (`app/api/**`):
 * builds a typed Swagger API client scoped to the current next-auth session user.
 */
export async function createBackendApiClientForSession(options?: Omit<BackendApiClientOptions, "userId">) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  return {
    api: createBackendApiClient({ ...options, userId: userId ?? undefined }),
    userId: userId ?? null,
  };
}


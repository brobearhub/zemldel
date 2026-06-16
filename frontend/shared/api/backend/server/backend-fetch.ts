import "server-only";

import { NextResponse } from "next/server";
import { backendSwaggerFetch } from "./swagger-transport";
import { createInternalAuthTokenForUserId } from "./internal-auth";

async function parseBackendBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

export function createInternalAuthHeaders(userId: string) {
  return {
    "x-internal-auth": createInternalAuthTokenForUserId(userId),
  };
}

export async function fetchBackend(path: string, init?: RequestInit) {
  // Switched to Swagger-generated transport (axios) to keep a single source of truth
  // for backend URL, timeouts, request-id propagation, and auth headers.
  // We still return a Web `Response` to preserve existing callers' behavior.
  return backendSwaggerFetch({ path, init });
}

export async function fetchBackendAsUser(path: string, userId: string, init?: RequestInit) {
  return backendSwaggerFetch({ path, init, userId });
}

export async function fetchBackendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchBackend(path, init);
  const body = await parseBackendBody(response);

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body && typeof body.error === "string"
        ? body.error
        : `Backend request failed with status ${response.status}`;

    throw new BackendApiError(message, response.status, body);
  }

  return body as T;
}

export async function fetchBackendJsonAsUser<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const response = await fetchBackendAsUser(path, userId, init);
  const body = await parseBackendBody(response);

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body && typeof body.error === "string"
        ? body.error
        : `Backend request failed with status ${response.status}`;

    throw new BackendApiError(message, response.status, body);
  }

  return body as T;
}

export async function proxyBackendResponse(path: string, init?: RequestInit) {
  const response = await fetchBackend(path, init);
  const body = await parseBackendBody(response);
  return NextResponse.json(body, { status: response.status });
}

export async function proxyBackendResponseAsUser(path: string, userId: string, init?: RequestInit) {
  const response = await fetchBackendAsUser(path, userId, init);
  const body = await parseBackendBody(response);
  return NextResponse.json(body, { status: response.status });
}


import type {
  MessengerLink,
  MessengerPlatform,
  MessengerStatus,
} from "../model/types";

export class MessengerRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MessengerRequestError";
  }
}

async function request<T>(
  path = "",
  method = "GET",
  body?: object,
): Promise<T> {
  const response = await fetch(`/api/messengers${path}`, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json();
  if (!response.ok) {
    throw new MessengerRequestError(
      typeof payload.message === "string"
        ? payload.message
        : "Не удалось обновить подключение. Попробуйте ещё раз.",
      response.status,
      typeof payload.code === "string" ? payload.code : undefined,
    );
  }
  return payload as T;
}

export const messengerApi = {
  status: () => request<MessengerStatus[]>(),
  link: (platform: MessengerPlatform) =>
    request<MessengerLink>(`/${platform}/link`, "POST"),
  confirm: (platform: MessengerPlatform, tokenId: string) =>
    request<void>(`/${platform}/confirm`, "POST", { tokenId }),
  disconnect: (platform: MessengerPlatform) =>
    request<void>(`/${platform}`, "DELETE"),
  notifications: (platform: MessengerPlatform, enabled: boolean) =>
    request<void>(`/${platform}/notifications`, "PATCH", { enabled }),
};

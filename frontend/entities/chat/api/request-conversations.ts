import type {
  ChatEnsureResponse,
  ChatServiceRequestConversationListItemDto,
} from "@/entities/chat/dto/chat.dto";

type Fetcher = typeof fetch;

function readError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export async function fetchCustomerRequestConversations(
  requestId: string,
  fetcher: Fetcher = fetch,
): Promise<ChatServiceRequestConversationListItemDto[]> {
  const response = await fetcher(
    `/api/chat/requests/${requestId}/conversations`,
    { cache: "no-store" },
  );
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(readError(payload, "Не удалось загрузить чаты"));
  }
  return payload as ChatServiceRequestConversationListItemDto[];
}

export async function ensureCustomerRequestConversation(
  requestId: string,
  fetcher: Fetcher = fetch,
): Promise<ChatEnsureResponse> {
  const response = await fetcher("/api/chat/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceRequestId: requestId }),
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    !("conversationId" in payload) ||
    typeof payload.conversationId !== "string"
  ) {
    throw new Error(readError(payload, "Не удалось открыть чат"));
  }
  return payload as ChatEnsureResponse;
}

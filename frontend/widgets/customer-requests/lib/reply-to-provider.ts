import type { ChatEnsureResponse, ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import type { RequestSubjectType } from "@/entities/request";

export function pickProviderConversation(
  conversations: readonly ChatServiceRequestConversationListItemDto[],
  providerId: string | null,
): ChatServiceRequestConversationListItemDto | null {
  if (providerId) {
    return conversations.find((row) => row.providerId === providerId) ?? null;
  }

  return [...conversations].sort((left, right) => {
    const leftAt = left.lastMessageAt ? Date.parse(left.lastMessageAt) : 0;
    const rightAt = right.lastMessageAt ? Date.parse(right.lastMessageAt) : 0;
    return rightAt - leftAt;
  })[0] ?? null;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

/**
 * Ответ заказчика в диалог исполнителя.
 * Why: карточка знает только заявку, а сообщение живёт в чате этого исполнителя.
 */
export async function replyToRequestProvider(input: {
  requestId: string;
  providerId: string | null;
  subjectType: RequestSubjectType;
  body: string;
}): Promise<void> {
  const text = input.body.trim();
  if (!text) {
    throw new Error("Введите сообщение");
  }

  const listResponse = await fetch(`/api/chat/requests/${input.requestId}/conversations`, {
    cache: "no-store",
  });
  if (!listResponse.ok) {
    throw new Error(await readError(listResponse, "Не удалось открыть чат"));
  }
  const conversations = (await listResponse.json().catch(() => null)) as
    | ChatServiceRequestConversationListItemDto[]
    | null;
  if (!Array.isArray(conversations)) {
    throw new Error("Не удалось открыть чат");
  }

  let conversation = pickProviderConversation(conversations, input.providerId);
  if (!conversation && input.subjectType === "SERVICE") {
    const ensureResponse = await fetch("/api/chat/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceRequestId: input.requestId }),
    });
    if (!ensureResponse.ok) {
      throw new Error(await readError(ensureResponse, "Не удалось открыть чат"));
    }
    const ensured = (await ensureResponse.json()) as ChatEnsureResponse;
    conversation = {
      conversationId: ensured.conversationId,
      providerId: input.providerId ?? "",
      providerName: "",
      lastMessageAt: null,
      lastSnippet: null,
    };
  }

  if (!conversation) {
    throw new Error("Нет диалога с исполнителем");
  }

  const sendResponse = await fetch(`/api/chat/conversations/${conversation.conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: text, clientMessageId: crypto.randomUUID() }),
  });
  if (!sendResponse.ok) {
    throw new Error(await readError(sendResponse, "Не удалось отправить ответ"));
  }
}

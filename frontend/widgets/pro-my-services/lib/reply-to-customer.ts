import type { ChatEnsureResponse } from "@/entities/chat/dto/chat.dto";

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

/**
 * Ответ исполнителя заказчику из списка заявок.
 * Why: ensure по заявке открывает диалог этого исполнителя и для услуги, и для свободной заявки.
 */
export async function replyToRequestCustomer(input: { requestId: string; body: string }): Promise<void> {
  const text = input.body.trim();
  if (!text) {
    throw new Error("Введите сообщение");
  }

  const ensureResponse = await fetch("/api/chat/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceRequestId: input.requestId }),
  });
  if (!ensureResponse.ok) {
    throw new Error(await readError(ensureResponse, "Не удалось открыть чат"));
  }
  const ensured = (await ensureResponse.json().catch(() => null)) as ChatEnsureResponse | null;
  if (!ensured?.conversationId) {
    throw new Error("Не удалось открыть чат");
  }

  const sendResponse = await fetch(`/api/chat/conversations/${ensured.conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: text, clientMessageId: crypto.randomUUID() }),
  });
  if (!sendResponse.ok) {
    throw new Error(await readError(sendResponse, "Не удалось отправить ответ"));
  }
}

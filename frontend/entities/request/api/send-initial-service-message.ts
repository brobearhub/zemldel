export const DEFAULT_SERVICE_REQUEST_GREETING = "Здравствуйте! Хочу обсудить мою задачу и дальнейшие шаги.";

export async function sendInitialServiceMessage(
  requestId: string,
  message: string | null,
  fetcher: typeof fetch = fetch,
) {
  const ensureResponse = await fetcher("/api/chat/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serviceRequestId: requestId }),
  });
  const ensured = await ensureResponse.json().catch(() => null) as { conversationId?: string } | null;
  if (!ensureResponse.ok || !ensured?.conversationId) throw new Error("Заявка создана, но открыть чат не удалось. Повторите отправку.");
  const response = await fetcher(`/api/chat/conversations/${encodeURIComponent(ensured.conversationId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: message?.trim() || DEFAULT_SERVICE_REQUEST_GREETING, clientMessageId: requestId }),
  });
  if (!response.ok) throw new Error("Заявка создана, но отправить сообщение не удалось. Повторите отправку.");
}

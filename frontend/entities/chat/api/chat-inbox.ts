import type { ChatInboxItemDto } from "@/entities/chat/dto/chat.dto";

export type ChatInboxRole = "customer" | "provider";

export async function fetchChatInbox(role: ChatInboxRole): Promise<ChatInboxItemDto[]> {
  const search = new URLSearchParams({ role });
  const response = await fetch(`/api/chat/inbox?${search.toString()}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as ChatInboxItemDto[] | { error?: string } | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && !Array.isArray(payload) && payload.error
        ? String(payload.error)
        : "Не удалось загрузить чат";
    throw new Error(message);
  }

  return (payload ?? []) as ChatInboxItemDto[];
}


import { describe, expect, it, vi } from "vitest";
import type { ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import {
  orchestrateProviderSelection,
  recoverSelectedProviderConversation,
} from "./select-provider-chat";

const conversationA: ChatServiceRequestConversationListItemDto = {
  conversationId: "conversation-a",
  providerId: "provider-a",
  providerName: "A",
  lastMessageAt: null,
  lastSnippet: null,
};

describe("provider selection chat orchestration", () => {
  it("сохраняет server-selected request и возвращает recovery при follow-up failure", async () => {
    const selectedRequest = {
      id: "request-1",
      providerId: "provider-b",
      lockedAt: "2026-11-01T10:00:00.000Z",
    };
    const onProviderSelected = vi.fn();

    const result = await orchestrateProviderSelection({
      requestId: "request-1",
      providerId: "provider-b",
      providerName: "B",
      previousConversations: [conversationA],
      onProviderSelected,
      dependencies: {
        selectProvider: vi.fn().mockResolvedValue(selectedRequest),
        listConversations: vi.fn().mockImplementation(() => {
          expect(onProviderSelected).toHaveBeenCalledWith(selectedRequest);
          return Promise.reject(new Error("list failed"));
        }),
        ensureConversation: vi.fn().mockRejectedValue(new Error("ensure failed")),
      },
    });

    expect(result.request).toBe(selectedRequest);
    expect(onProviderSelected).toHaveBeenCalledWith(selectedRequest);
    expect(result.chat).toEqual({
      kind: "recovery-required",
      providerId: "provider-b",
      providerName: "B",
      message:
        "Исполнитель выбран, но открыть его чат не удалось. Повторите открытие чата.",
    });
  });

  it("retry восстанавливает выбранный чат без reload", async () => {
    const result = await recoverSelectedProviderConversation({
      requestId: "request-1",
      providerId: "provider-b",
      providerName: "B",
      previousConversations: [conversationA],
      dependencies: {
        listConversations: vi.fn().mockRejectedValue(new Error("list failed")),
        ensureConversation: vi.fn().mockResolvedValue({
          conversationId: "conversation-b",
          messages: [],
        }),
      },
    });

    expect(result).toEqual({
      kind: "ready",
      selectedConversationId: "conversation-b",
      conversations: [
        conversationA,
        {
          conversationId: "conversation-b",
          providerId: "provider-b",
          providerName: "B",
          lastMessageAt: null,
          lastSnippet: null,
        },
      ],
    });
  });
});

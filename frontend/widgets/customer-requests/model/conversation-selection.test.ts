import { describe, expect, it } from "vitest";
import type { ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import {
  resolveActiveConversationId,
  resolveSelectionAfterProviderSelect,
  resolveProviderSelectionVisibility,
} from "./conversation-selection";

const conversations: ChatServiceRequestConversationListItemDto[] = [
  {
    conversationId: "conversation-a",
    providerId: "provider-a",
    providerName: "A",
    lastMessageAt: "2026-11-01T10:00:00.000Z",
    lastSnippet: "Новое сообщение",
  },
  {
    conversationId: "conversation-b",
    providerId: "provider-b",
    providerName: "B",
    lastMessageAt: "2026-10-31T10:00:00.000Z",
    lastSnippet: "Старое сообщение",
  },
];

describe("resolveActiveConversationId", () => {
  it("preserves a valid archived conversation during ordinary refresh", () => {
    expect(resolveActiveConversationId({ conversations, currentConversationId: "conversation-a",
      lockedAt: "2026-11-01", selectedProviderId: "provider-b", preferSelectedProvider: false,
    })).toBe("conversation-a");
  });

  it("falls back to the chosen provider if the archived conversation disappears", () => {
    expect(resolveActiveConversationId({ conversations, currentConversationId: "missing",
      lockedAt: "2026-11-01", selectedProviderId: "provider-b", preferSelectedProvider: false,
    })).toBe("conversation-b");
  });
  it("после lock выбирает тред выбранного provider, а не первый по активности", () => {
    expect(
      resolveActiveConversationId({
        conversations,
        currentConversationId: "conversation-a",
        lockedAt: "2026-11-01T10:05:00.000Z",
        selectedProviderId: "provider-b",
      }),
    ).toBe("conversation-b");
  });

  it("до lock сохраняет валидный выбор и иначе берёт первый тред", () => {
    expect(
      resolveActiveConversationId({
        conversations,
        currentConversationId: "conversation-b",
        lockedAt: null,
        selectedProviderId: null,
      }),
    ).toBe("conversation-b");

    expect(
      resolveActiveConversationId({
        conversations,
        currentConversationId: "missing",
        lockedAt: null,
        selectedProviderId: null,
      }),
    ).toBe("conversation-a");
  });

  it("при lock без загруженного выбранного треда закрывает ввод", () => {
    expect(
      resolveActiveConversationId({
        conversations: conversations.slice(0, 1),
        currentConversationId: "conversation-a",
        lockedAt: "2026-11-01T10:05:00.000Z",
        selectedProviderId: "provider-b",
      }),
    ).toBeNull();
  });
});

describe("resolveProviderSelectionVisibility", () => {
  it("не показывает multi-provider selection для SERVICE", () => {
    expect(
      resolveProviderSelectionVisibility({
        subjectType: "SERVICE",
        lockedAt: null,
      }),
    ).toBe(false);
  });
});

describe("resolveSelectionAfterProviderSelect", () => {
  it("успех выбора B переводит A на B, ошибка сохраняет A", () => {
    expect(
      resolveSelectionAfterProviderSelect({
        previousConversationId: "conversation-a",
        selectedProviderId: "provider-b",
        conversations,
        succeeded: true,
      }),
    ).toBe("conversation-b");

    expect(
      resolveSelectionAfterProviderSelect({
        previousConversationId: "conversation-a",
        selectedProviderId: "provider-b",
        conversations,
        succeeded: false,
      }),
    ).toBe("conversation-a");
  });
});

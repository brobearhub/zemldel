import { describe, expect, it, vi } from "vitest";
import type { ChatServiceRequestConversationListItemDto } from "@/entities/chat/dto/chat.dto";
import { pickProviderConversation, replyToRequestProvider } from "./reply-to-provider";

function conversation(
  overrides: Partial<ChatServiceRequestConversationListItemDto> &
    Pick<ChatServiceRequestConversationListItemDto, "conversationId" | "providerId">,
): ChatServiceRequestConversationListItemDto {
  return {
    providerName: "Исполнитель",
    lastMessageAt: null,
    lastSnippet: null,
    ...overrides,
  };
}

describe("pickProviderConversation", () => {
  it("берёт диалог назначенного исполнителя", () => {
    const chosen = conversation({ conversationId: "c-a", providerId: "p-a", lastMessageAt: "2026-10-01T00:00:00.000Z" });
    const newer = conversation({ conversationId: "c-b", providerId: "p-b", lastMessageAt: "2026-10-08T00:00:00.000Z" });

    expect(pickProviderConversation([newer, chosen], "p-a")).toEqual(chosen);
  });

  it("без назначенного исполнителя берёт самый новый диалог", () => {
    const older = conversation({ conversationId: "c-a", providerId: "p-a", lastMessageAt: "2026-10-01T00:00:00.000Z" });
    const newer = conversation({ conversationId: "c-b", providerId: "p-b", lastMessageAt: "2026-10-08T00:00:00.000Z" });

    expect(pickProviderConversation([older, newer], null)?.conversationId).toBe("c-b");
  });
});

describe("replyToRequestProvider", () => {
  it("отправляет текст в диалог исполнителя", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/conversations") && !init?.method) {
        return new Response(
          JSON.stringify([
            conversation({ conversationId: "c-a", providerId: "p-a" }),
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ message: { id: "m1" } }), { status: 201 });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await replyToRequestProvider({
        requestId: "r1",
        providerId: "p-a",
        subjectType: "SERVICE",
        body: "  Хорошо, жду  ",
      });

      const sendCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/messages"));
      expect(sendCall?.[0]).toBe("/api/chat/conversations/c-a/messages");
      expect(JSON.parse(String(sendCall?.[1]?.body))).toMatchObject({ body: "Хорошо, жду" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

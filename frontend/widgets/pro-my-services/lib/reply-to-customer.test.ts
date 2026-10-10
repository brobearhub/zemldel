import { describe, expect, it, vi } from "vitest";
import { replyToRequestCustomer } from "./reply-to-customer";

describe("replyToRequestCustomer", () => {
  it("открывает диалог заявки и отправляет текст", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url) === "/api/chat/ensure") {
        return new Response(JSON.stringify({ conversationId: "c1", messages: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: { id: "m1" } }), { status: 201 });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await replyToRequestCustomer({ requestId: "r1", body: "  Завтра приеду  " });

      const ensureCall = fetchMock.mock.calls[0];
      expect(ensureCall?.[0]).toBe("/api/chat/ensure");
      expect(JSON.parse(String(ensureCall?.[1]?.body))).toEqual({ serviceRequestId: "r1" });

      const sendCall = fetchMock.mock.calls[1];
      expect(sendCall?.[0]).toBe("/api/chat/conversations/c1/messages");
      expect(JSON.parse(String(sendCall?.[1]?.body))).toMatchObject({ body: "Завтра приеду" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("пустой текст не открывает чат", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(replyToRequestCustomer({ requestId: "r1", body: "   " })).rejects.toThrow("Введите сообщение");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

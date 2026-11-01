import { describe, expect, it, vi } from "vitest";
import {
  ensureCustomerRequestConversation,
  fetchCustomerRequestConversations,
} from "./request-conversations";

describe("request conversations data layer", () => {
  it("использует только BFF routes для list и ensure", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ conversationId: "conversation-b", messages: [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await fetchCustomerRequestConversations("request-1", fetcher);
    await ensureCustomerRequestConversation("request-1", fetcher);

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/api/chat/requests/request-1/conversations",
      { cache: "no-store" },
    );
    expect(fetcher).toHaveBeenNthCalledWith(2, "/api/chat/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceRequestId: "request-1" }),
    });
  });
});

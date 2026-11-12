import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { ServiceRequestChatPanel } from "./ServiceRequestChatPanel";

const socket = vi.hoisted(() => ({
  socket: null,
  socketConnected: true,
  setOpenConversationId: vi.fn(),
  joinConversationRoom: vi.fn(async () => ({
    ok: true,
    viewerSide: "customer",
    peerOnline: true,
  })),
  clearUnreadForConversation: vi.fn(),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "customer", image: "/avatars/customer.png" } } }),
}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => socket,
}));

describe("customer messenger transport", () => {
  const sent: {
    body: string;
    clientMessageId: string;
    replyToMessageId?: string;
  }[] = [];
  const incoming = {
    id: "incoming",
    conversationId: "provider-conversation",
    senderUserId: "provider",
    senderName: "Исполнитель",
    senderImage: "/avatars/provider.png",
    body: "Когда удобно приехать?",
    createdAt: "2026-11-10T09:00:00Z",
    clientMessageId: "incoming-client-id",
  };
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    sent.length = 0;
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = new URL(String(input), "http://test");
        if (url.pathname.endsWith("/access"))
          return Response.json({ canRead: true, canWrite: true });
        if (url.pathname.endsWith("/messages") && init?.method === "POST") {
          expect(url.pathname).toBe(
            "/api/chat/conversations/provider-conversation/messages",
          );
          const payload = JSON.parse(init.body as string);
          sent.push(payload);
          if (sent.length === 1)
            return Response.json(
              { error: "Временно недоступно" },
              { status: 503 },
            );
          return Response.json({
            message: {
              ...incoming,
              ...payload,
              id: "sent",
              senderUserId: "customer",
              createdAt: "2026-11-10T09:01:00Z",
            },
            alreadyExisted: false,
          });
        }
        if (url.pathname.endsWith("/messages"))
          return Response.json(url.searchParams.has("after") ? [] : [incoming]);
        return Response.json({});
      }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends a customer reply through the existing outbox and retries without a duplicate", async () => {
    const onMessage = vi.fn();
    render(
      <ThemeProvider theme={createAppTheme("light")}>
        <ServiceRequestChatPanel
          serviceRequestId="request"
          conversationId="provider-conversation"
          appearance="messenger"
          onMessage={onMessage}
        />
      </ThemeProvider>,
    );
    await screen.findByText(incoming.body);
    expect(document.querySelector('img[src="/avatars/provider.png"]')).toBeInTheDocument();
    await waitFor(() =>
      expect(socket.clearUnreadForConversation).toHaveBeenCalledWith(
        "provider-conversation",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ответить" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Сообщение" }),
      { target: { value: "Завтра в 10:00" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Отправить" }),
    );
    const retry = await screen.findByRole("button", { name: /Повторить/ });
    expect(document.querySelector('img[src="/avatars/customer.png"]')).toBeInTheDocument();
    fireEvent.click(retry);
    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(1));
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
    expect(sent[0].replyToMessageId).toBe("incoming");
    expect(sent[0].clientMessageId).toBeTruthy();
    expect(
      within(screen.getByRole("log", { name: "Сообщения чата" })).getAllByText(
        "Завтра в 10:00",
      ),
    ).toHaveLength(1);
    expect(
      screen.getByRole("textbox", { name: "Сообщение" }),
    ).toHaveValue("");
  });
});

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatSocketProvider } from "./ChatSocketProvider";
import { useChatSocket } from "./ChatSocketContext";
const mock = vi.hoisted(() => ({ io: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: mock.io }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: { user: { id: "qa" } } }),
}));
vi.mock("@/shared/config/chat-socket", () => ({
  getChatSocketUrl: () => "http://socket.test",
}));
function Probe() {
  return <span>{String(useChatSocket().socketConnected)}</span>;
}
function UnreadProbe() {
  const chat = useChatSocket();
  return (
    <>
      <span data-testid="request-unread">
        {chat.unreadByRequestId.request ?? 0}
      </span>
      <span data-testid="first-unread">
        {chat.unreadByConversationId.first ?? 0}
      </span>
      <span data-testid="second-unread">
        {chat.unreadByConversationId.second ?? 0}
      </span>
      <span data-testid="other-unread">
        {chat.unreadByConversationId.other ?? 0}
      </span>
      <button onClick={() => chat.clearUnreadForConversation("first")}>
        Прочитать первый
      </button>
    </>
  );
}
describe("socket recovery", () => {
  let socket: {
    connected: boolean;
    auth: unknown;
    on: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    removeAllListeners: ReturnType<typeof vi.fn>;
  };
  let handlers: Record<string, (...args: unknown[]) => void>;
  const token = () => new Response(JSON.stringify({ token: "test-token" }));
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    handlers = {};
    socket = {
      connected: false,
      auth: {},
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    mock.io.mockReturnValue(socket);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("keeps other providers unread when one conversation in the same request is read", async () => {
    vi.stubGlobal("fetch", vi.fn(token));
    render(
      <ChatSocketProvider>
        <UnreadProbe />
      </ChatSocketProvider>,
    );
    await act(async () => {});
    act(() => {
      handlers["chat.unreadHint"]({
        conversationId: "first",
        serviceRequestId: "request",
      });
      handlers["chat.unreadHint"]({
        conversationId: "second",
        serviceRequestId: "request",
      });
      handlers["chat.unreadHint"]({
        conversationId: "second",
        serviceRequestId: "request",
      });
    });
    expect(screen.getByTestId("request-unread")).toHaveTextContent("3");
    fireEvent.click(screen.getByRole("button", { name: "Прочитать первый" }));
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("second-unread")).toHaveTextContent("2");
    expect(screen.getByTestId("request-unread")).toHaveTextContent("2");
  });
  it("removes only a deleted request from unread counts and ignores delayed hints", async () => {
    vi.stubGlobal("fetch", vi.fn(token));
    render(
      <ChatSocketProvider>
        <UnreadProbe />
      </ChatSocketProvider>,
    );
    await act(async () => {});
    act(() => {
      handlers["chat.unreadHint"]({ conversationId: "first", serviceRequestId: "request" });
      handlers["chat.unreadHint"]({ conversationId: "second", serviceRequestId: "request" });
      handlers["chat.unreadHint"]({ conversationId: "other", serviceRequestId: "other-request" });
      handlers["request.changed"]({ requestId: "request" });
    });
    expect(screen.getByTestId("request-unread")).toHaveTextContent("2");
    act(() => handlers["request.changed"]({ requestId: "request", deleted: true }));
    expect(screen.getByTestId("request-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("1");
    act(() => handlers["chat.unreadHint"]({ conversationId: "first", serviceRequestId: "request" }));
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("1");
  });

  it("does not restore a deleted conversation from an older unread response", async () => {
    let finishInbox!: (response: Response) => void;
    const fetcher = vi.fn((url: string) =>
      url.startsWith("/api/chat/unread")
        ? new Promise<Response>((resolve) => { finishInbox = resolve; })
        : Promise.resolve(token()),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
      <ChatSocketProvider>
        <UnreadProbe />
      </ChatSocketProvider>,
    );
    await act(async () => {});
    act(() => {
      handlers["chat.unreadHint"]({ conversationId: "first", serviceRequestId: "request" });
      socket.connected = true;
      handlers.connect();
    });
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/api/chat/unread"), expect.anything());
    act(() => handlers["request.changed"]({ requestId: "request", deleted: true }));
    await act(async () => {
      finishInbox(new Response(JSON.stringify([{ conversationId: "first", serviceRequestId: "request", unreadCount: 1 }])));
    });
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
  });

  it("removes conversations deleted while offline when the authoritative snapshot refreshes", async () => {
    let snapshot = [
      { conversationId: "first", serviceRequestId: "request", unreadCount: 2 },
      { conversationId: "other", serviceRequestId: "other-request", unreadCount: 3 },
    ];
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(
      url.startsWith("/api/chat/unread") ? new Response(JSON.stringify(snapshot)) : token(),
    )));
    render(<ChatSocketProvider><UnreadProbe /></ChatSocketProvider>);
    await act(async () => {});
    await act(async () => { socket.connected = true; handlers.connect(); });
    expect(screen.getByTestId("first-unread")).toHaveTextContent("2");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("3");
    snapshot = [{ conversationId: "other", serviceRequestId: "other-request", unreadCount: 3 }];
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("3");
  });

  it("retries a stale snapshot after a socket event and reconciles other conversations", async () => {
    let resolveStale!: (response: Response) => void;
    let unreadCalls = 0;
    const fetcher = vi.fn((url: string) => {
      if (!url.startsWith("/api/chat/unread")) return Promise.resolve(token());
      unreadCalls += 1;
      if (unreadCalls === 1) {
        return new Promise<Response>((resolve) => { resolveStale = resolve; });
      }
      return Promise.resolve(new Response(JSON.stringify([
        { conversationId: "other", serviceRequestId: "other-request", unreadCount: 3 },
      ])));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<ChatSocketProvider><UnreadProbe /></ChatSocketProvider>);
    await act(async () => {});
    act(() => {
      handlers["chat.unreadHint"]({ conversationId: "first", serviceRequestId: "request" });
      handlers["chat.unreadHint"]({ conversationId: "other", serviceRequestId: "other-request" });
      socket.connected = true;
      handlers.connect();
    });
    await act(async () => {});
    act(() => handlers["request.changed"]({ requestId: "request", deleted: true }));
    await act(async () => {
      resolveStale(new Response(JSON.stringify([
        { conversationId: "first", serviceRequestId: "request", unreadCount: 1 },
        { conversationId: "other", serviceRequestId: "other-request", unreadCount: 1 },
      ])));
    });
    expect(unreadCalls).toBe(2);
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("3");
  });

  it("keeps existing counts when unread refresh fails", async () => {
    let fail = false;
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(
      url.startsWith("/api/chat/unread")
        ? fail ? new Response("{}", { status: 503 }) : new Response(JSON.stringify([{ conversationId: "other", serviceRequestId: "other-request", unreadCount: 3 }]))
        : token(),
    )));
    render(<ChatSocketProvider><UnreadProbe /></ChatSocketProvider>);
    await act(async () => {});
    await act(async () => { socket.connected = true; handlers.connect(); });
    expect(screen.getByTestId("other-unread")).toHaveTextContent("3");
    fail = true;
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(screen.getByTestId("other-unread")).toHaveTextContent("3");
  });

  it("reconciles a delayed hint already included in the server snapshot", async () => {
    const rows = [{ conversationId: "other", serviceRequestId: "other-request", unreadCount: 1 }];
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(
      url.startsWith("/api/chat/unread") ? new Response(JSON.stringify(rows)) : token(),
    )));
    render(<ChatSocketProvider><UnreadProbe /></ChatSocketProvider>);
    await act(async () => {});
    await act(async () => { socket.connected = true; handlers.connect(); });
    expect(screen.getByTestId("other-unread")).toHaveTextContent("1");
    await act(async () => {
      handlers["chat.unreadHint"]({ conversationId: "other", serviceRequestId: "other-request" });
    });
    expect(screen.getByTestId("other-unread")).toHaveTextContent("1");
  });

  it("coalesces focus refreshes and does not apply a stale snapshot", async () => {
    const pending: Array<(response: Response) => void> = [];
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.startsWith("/api/chat/unread")
        ? new Promise<Response>((resolve) => { pending.push(resolve); })
        : Promise.resolve(token()),
    ));
    render(<ChatSocketProvider><UnreadProbe /></ChatSocketProvider>);
    await act(async () => {});
    act(() => { socket.connected = true; handlers.connect(); });
    await act(async () => {});
    act(() => window.dispatchEvent(new Event("focus")));
    expect(pending).toHaveLength(1);
    await act(async () => pending[0](new Response(JSON.stringify([
      { conversationId: "first", serviceRequestId: "request", unreadCount: 1 },
    ]))));
    expect(pending).toHaveLength(2);
    await act(async () => pending[1](new Response(JSON.stringify([
      { conversationId: "other", serviceRequestId: "other-request", unreadCount: 2 },
    ]))));
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("2");
  });

  it("coalesces a burst of hints while a read occurs during a snapshot", async () => {
    const pending: Array<(response: Response) => void> = [];
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.startsWith("/api/chat/unread")
        ? new Promise<Response>((resolve) => { pending.push(resolve); })
        : Promise.resolve(token()),
    ));
    render(<ChatSocketProvider><UnreadProbe /></ChatSocketProvider>);
    await act(async () => {});
    act(() => { socket.connected = true; handlers.connect(); });
    await act(async () => {});
    act(() => {
      handlers["chat.unreadHint"]({ conversationId: "first", serviceRequestId: "request" });
      handlers["chat.unreadHint"]({ conversationId: "first", serviceRequestId: "request" });
      handlers["chat.unreadHint"]({ conversationId: "other", serviceRequestId: "other-request" });
    });
    fireEvent.click(screen.getByRole("button", { name: "Прочитать первый" }));
    expect(pending).toHaveLength(1);
    await act(async () => pending[0](new Response(JSON.stringify([
      { conversationId: "first", serviceRequestId: "request", unreadCount: 2 },
      { conversationId: "other", serviceRequestId: "other-request", unreadCount: 0 },
    ]))));
    expect(pending).toHaveLength(2);
    await act(async () => pending[1](new Response(JSON.stringify([
      { conversationId: "first", serviceRequestId: "request", unreadCount: 0 },
      { conversationId: "other", serviceRequestId: "other-request", unreadCount: 1 },
    ]))));
    expect(screen.getByTestId("first-unread")).toHaveTextContent("0");
    expect(screen.getByTestId("other-unread")).toHaveTextContent("1");
    expect(pending).toHaveLength(2);
  });
  it.each(["network", "503"])(
    "retries an initial %s failure without a reload",
    async (failure) => {
      const fetcher = vi
        .fn()
        .mockImplementationOnce(() =>
          failure === "network"
            ? Promise.reject(new TypeError("offline"))
            : Promise.resolve(new Response("{}", { status: 503 })),
        )
        .mockImplementation(token);
      vi.stubGlobal("fetch", fetcher);
      render(
        <ChatSocketProvider>
          <Probe />
        </ChatSocketProvider>,
      );
      await act(async () => {});
      expect(socket.connect).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(socket.connect).toHaveBeenCalledTimes(1);
      await act(async () => {
        socket.connected = true;
        handlers.connect();
      });
      expect(screen.getByText("true")).toBeInTheDocument();
    },
  );
  it("recovers online and refreshes credentials without disconnecting a healthy socket", async () => {
    vi.stubGlobal("fetch", vi.fn(token));
    render(
      <ChatSocketProvider>
        <Probe />
      </ChatSocketProvider>,
    );
    await act(async () => {});
    socket.connected = true;
    await act(async () => {
      handlers.connect();
      await vi.advanceTimersByTimeAsync(240_000);
    });
    expect(socket.disconnect).not.toHaveBeenCalled();
    socket.connected = false;
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(socket.connect).toHaveBeenCalledTimes(2);
  });
  it("cleans up and does not retry authentication failures in a tight loop", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    const { unmount } = render(
      <ChatSocketProvider>
        <Probe />
      </ChatSocketProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(240_000);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
  it("refreshes credentials after a server disconnect and closes the socket when authorization is lost", async () => {
    const fetcher = vi.fn(token);
    vi.stubGlobal("fetch", fetcher);
    render(
      <ChatSocketProvider>
        <Probe />
      </ChatSocketProvider>,
    );
    await act(async () => {});
    await act(async () => {
      handlers.disconnect("io server disconnect");
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    socket.connected = true;
    fetcher.mockImplementation(() => new Response("{}", { status: 403 }));
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});

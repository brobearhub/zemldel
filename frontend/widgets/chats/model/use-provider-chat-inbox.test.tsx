import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProviderChatInbox } from "./use-provider-chat-inbox";
import { fetchChatInbox } from "@/entities/chat/api/chat-inbox";
import type { ChatInboxItemDto } from "@/entities/chat/dto/chat.dto";

const context = vi.hoisted(() => {
  const listeners = new Map<string, Set<(data: unknown) => void>>();
  return {
    listeners,
    socket: {
      on: vi.fn((event: string, fn: (data: unknown) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(fn);
      }),
      off: vi.fn((event: string, fn: (data: unknown) => void) =>
        listeners.get(event)?.delete(fn),
      ),
    },
  };
});
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => ({ socket: context.socket, unreadByRequestId: {} }),
}));
vi.mock("@/entities/chat/api/chat-inbox", () => ({ fetchChatInbox: vi.fn() }));
const rows: ChatInboxItemDto[] = [
  {
    conversationId: "a",
    serviceRequestId: "r-a",
    title: "Межевание",
    peerName: "Анна",
    lastMessageAt: "2026-11-10T07:00:00Z",
    lastSnippet: "Первое",
  },
  {
    conversationId: "b",
    serviceRequestId: "r-b",
    title: "План",
    peerName: "Дмитрий",
    lastMessageAt: "2026-11-10T06:00:00Z",
    lastSnippet: "Старое",
  },
];
function emit(event: string, data: unknown) {
  act(() => {
    context.listeners.get(event)?.forEach((fn) => fn(data));
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  context.listeners.clear();
  vi.mocked(fetchChatInbox).mockResolvedValue(rows);
});

describe("provider inbox existing socket", () => {
  it("updates the preview and order from a hint without another HTTP request", async () => {
    const { result, unmount } = renderHook(() =>
      useProviderChatInbox("actor:provider"),
    );
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    emit("chat.unreadHint", {
      conversationId: "b",
      lastMessageAt: "2026-11-10T08:00:00Z",
      bodySnippet: "Новое",
    });
    expect(result.current.items?.[0]).toMatchObject({
      conversationId: "b",
      lastSnippet: "Новое",
    });
    expect(fetchChatInbox).toHaveBeenCalledTimes(1);
    unmount();
    expect([...context.listeners.values()].every((set) => set.size === 0)).toBe(
      true,
    );
  });
  it("loads context for a new conversation and recovers on reconnect", async () => {
    const { result } = renderHook(() => useProviderChatInbox("actor:provider"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    emit("chat.unreadHint", {
      conversationId: "new",
      lastMessageAt: "2026-11-10T08:00:00Z",
    });
    await waitFor(() => expect(fetchChatInbox).toHaveBeenCalledTimes(2));
    act(() => window.dispatchEvent(new Event("request:sync")));
    await waitFor(() => expect(fetchChatInbox).toHaveBeenCalledTimes(3));
  });
  it("preserves a newer socket event when an older snapshot arrives late", async () => {
    const { result } = renderHook(() => useProviderChatInbox("actor:provider"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    let finish!: (value: ChatInboxItemDto[]) => void;
    vi.mocked(fetchChatInbox).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    act(() => result.current.refresh());
    emit("message.created", {
      conversationId: "a",
      createdAt: "2026-11-10T09:00:00Z",
      body: "Самое новое",
    });
    await act(async () => finish(rows));
    expect(result.current.items?.[0].lastSnippet).toBe("Самое новое");
  });
  it("keeps existing conversations after an HTTP error and allows retry", async () => {
    const { result } = renderHook(() => useProviderChatInbox("actor:provider"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    vi.mocked(fetchChatInbox).mockRejectedValueOnce(new Error("Offline"));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBe("Offline"));
    expect(result.current.items).toHaveLength(2);
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});

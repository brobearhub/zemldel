import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderChatsWorkspace } from "./ProviderChatsWorkspace";
const state = vi.hoisted(() => ({
  requestId: undefined as string | undefined,
  query: "",
  unread: { "r-b": 2 } as Record<string, number>,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ requestId: state.requestId }),
  useSearchParams: () => new URLSearchParams(state.query),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "actor" } } }),
}));
vi.mock("@/core/auth/authorization", () => ({
  getActiveMembership: () => ({ providerId: "provider" }),
}));
vi.mock("../model/use-chat-viewport", () => ({ useChatViewport: vi.fn() }));
vi.mock("../model/use-provider-chat-inbox", () => ({
  useProviderChatInbox: () => ({
    items: [
      {
        conversationId: "a",
        serviceRequestId: "r-a",
        title: "Межевание",
        peerName: "Анна",
        lastSnippet: "Привет",
        lastMessageAt: null,
      },
      {
        conversationId: "b",
        serviceRequestId: "r-b",
        title: "План",
        peerName: "Борис",
        lastSnippet: "Вопрос",
        lastMessageAt: null,
      },
    ],
    error: null,
    refresh: vi.fn(),
    onMessage: vi.fn(),
    unreadByRequestId: state.unread,
  }),
}));
vi.mock("@/widgets/chat/ui/ServiceRequestChatPanel", () => ({
  ServiceRequestChatPanel: ({ conversationId }: { conversationId: string }) => (
    <div data-testid="active-thread">{conversationId}</div>
  ),
}));
beforeEach(() => {
  state.requestId = undefined;
  state.query = "";
  state.unread = { "r-b": 2 };
});
describe("provider messenger navigation", () => {
  it("searches by client and preserves the query on route changes", () => {
    const { rerender } = render(<ProviderChatsWorkspace />);
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск чатов" }), {
      target: { value: "Борис" },
    });
    expect(
      within(screen.getByRole("list", { name: "Диалоги" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(1);
    state.requestId = "r-b";
    state.query = "conversation=b";
    rerender(<ProviderChatsWorkspace />);
    expect(screen.getByTestId("active-thread")).toHaveTextContent("b");
    expect(screen.getByRole("link", { name: "К заявке" })).toHaveAttribute(
      "href",
      "/pro/requests/r-b",
    );
    state.requestId = undefined;
    state.query = "";
    rerender(<ProviderChatsWorkspace />);
    expect(screen.getByRole("textbox", { name: "Поиск чатов" })).toHaveValue(
      "Борис",
    );
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
  });
  it("filters by unread state and shows the read empty state", () => {
    const { rerender } = render(<ProviderChatsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Непрочитанные · 1" }));
    expect(
      within(screen.getByRole("list", { name: "Диалоги" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(1);
    state.unread = { "r-b": 0 };
    rerender(<ProviderChatsWorkspace />);
    expect(screen.getByText("Все сообщения прочитаны")).toBeInTheDocument();
  });
  it("does not open a foreign conversation from the URL", () => {
    state.requestId = "r-a";
    state.query = "conversation=foreign";
    render(<ProviderChatsWorkspace />);
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
    expect(
      screen.getByText("Выберите диалог по этой заявке."),
    ).toBeInTheDocument();
  });
  it("does not open a conversation from a different request", () => {
    state.requestId = "r-a";
    state.query = "conversation=b";
    render(<ProviderChatsWorkspace />);
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
  });
});

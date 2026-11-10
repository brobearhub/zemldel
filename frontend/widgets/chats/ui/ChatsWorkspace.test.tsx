import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatsWorkspace } from "./ChatsWorkspace";
const state = vi.hoisted(() => ({
  requestId: undefined as string | undefined,
  query: "",
  sharedRequest: false,
  unread: { b: 2 } as Record<string, number>,
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
vi.mock("../model/use-chat-inbox", () => ({
  useChatInbox: () => ({
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
        serviceRequestId: state.sharedRequest ? "r-a" : "r-b",
        title: "План",
        peerName: "Борис",
        lastSnippet: "Вопрос",
        lastMessageAt: null,
      },
    ],
    error: null,
    refresh: vi.fn(),
    onMessage: vi.fn(),
    unreadByConversationId: state.unread,
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
  state.sharedRequest = false;
  state.unread = { b: 2 };
});
describe("provider messenger navigation", () => {
  it("uses customer chat and request routes with provider identity", () => {
    state.requestId = "r-a";
    state.query = "conversation=a";
    render(<ChatsWorkspace role="customer" />);
    expect(screen.getByTestId("active-thread")).toHaveTextContent("a");
    expect(screen.getByText("Исполнитель")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К заявке" })).toHaveAttribute(
      "href",
      "/profile/requests/r-a",
    );
    expect(screen.getByRole("link", { name: "К чатам" })).toHaveAttribute(
      "href",
      "/profile/chats",
    );
    const links = within(
      screen.getByRole("list", { name: "Диалоги" }),
    ).getAllByRole("link");
    expect(links[0]).toHaveAttribute(
      "href",
      "/profile/chats/r-a?conversation=a",
    );
  });

  it("requires a conversation choice when a customer discusses one request with several providers", () => {
    state.requestId = "r-a";
    state.sharedRequest = true;
    const view = render(<ChatsWorkspace role="customer" />);
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
    expect(
      screen.getByText("Выберите диалог по этой заявке."),
    ).toBeInTheDocument();
    state.query = "conversation=b";
    view.rerender(<ChatsWorkspace role="customer" />);
    expect(screen.getByTestId("active-thread")).toHaveTextContent("b");
  });

  it("searches by client and preserves the query on route changes", () => {
    const { rerender } = render(<ChatsWorkspace role="provider" />);
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
    rerender(<ChatsWorkspace role="provider" />);
    expect(screen.getByTestId("active-thread")).toHaveTextContent("b");
    expect(screen.getByRole("link", { name: "К заявке" })).toHaveAttribute(
      "href",
      "/pro/requests/r-b",
    );
    state.requestId = undefined;
    state.query = "";
    rerender(<ChatsWorkspace role="provider" />);
    expect(screen.getByRole("textbox", { name: "Поиск чатов" })).toHaveValue(
      "Борис",
    );
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
  });
  it("filters by unread state and shows the read empty state", () => {
    const { rerender } = render(<ChatsWorkspace role="provider" />);
    fireEvent.click(screen.getByRole("button", { name: "Непрочитанные · 1" }));
    expect(
      within(screen.getByRole("list", { name: "Диалоги" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(1);
    state.unread = { b: 0 };
    rerender(<ChatsWorkspace role="provider" />);
    expect(screen.getByText("Все сообщения прочитаны")).toBeInTheDocument();
  });
  it("does not open a foreign conversation from the URL", () => {
    state.requestId = "r-a";
    state.query = "conversation=foreign";
    render(<ChatsWorkspace role="provider" />);
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
    expect(
      screen.getByText("Выберите диалог по этой заявке."),
    ).toBeInTheDocument();
  });
  it("does not open a conversation from a different request", () => {
    state.requestId = "r-a";
    state.query = "conversation=b";
    render(<ChatsWorkspace role="provider" />);
    expect(screen.queryByTestId("active-thread")).not.toBeInTheDocument();
  });
});

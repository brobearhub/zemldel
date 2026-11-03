import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRequestPage } from "./ChatRequestPage";
import { fetchChatInbox } from "@/entities/chat/api/chat-inbox";
const context = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(context.query),
}));
vi.mock("@/entities/chat/api/chat-inbox", () => ({ fetchChatInbox: vi.fn() }));
vi.mock("@/widgets/cabinet-chrome/lib/cabinet-role-storage", () => ({
  getLastCabinetRole: () => "customer",
}));
vi.mock("@/widgets/chat/ui/ServiceRequestChatPanel", () => ({
  ServiceRequestChatPanel: ({
    conversationId,
    title,
  }: {
    conversationId: string;
    title: string;
  }) => (
    <div data-testid="thread">
      {conversationId} {title}
    </div>
  ),
}));
const rows = ["a", "b"].map((id) => ({
  serviceRequestId: "request1",
  conversationId: id,
  title: "Межевание участка",
  peerName: `Компания ${id}`,
  requestStatus: "DISCUSSING",
  lastMessageAt: null,
  lastSnippet: null,
}));
beforeEach(() => {
  vi.clearAllMocks();
  context.query = "";
  vi.mocked(fetchChatInbox).mockResolvedValue(rows);
});
describe("chat context", () => {
  it("keeps an explicit choice when there are several providers", async () => {
    render(<ChatRequestPage requestId="request1" />);
    expect(
      await screen.findByRole("heading", { name: "Межевание участка" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("thread")).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Собеседник" }));
    fireEvent.click(await screen.findByRole("option", { name: "Компания b" }));
    expect(screen.getByTestId("thread")).toHaveTextContent("b Компания b");
    expect(screen.getByRole("link", { name: "К заявке" })).toHaveAttribute(
      "href",
      "/profile/requests/request1",
    );
  });
  it("opens only an authorized conversation from the inbox link", async () => {
    context.query = "conversation=a";
    render(<ChatRequestPage requestId="request1" />);
    expect(await screen.findByTestId("thread")).toHaveTextContent(
      "a Компания a",
    );
  });
  it("does not open an arbitrary conversation id supplied in the URL", async () => {
    context.query = "conversation=foreign";
    render(<ChatRequestPage requestId="request1" />);
    await screen.findByRole("heading", { name: "Межевание участка" });
    expect(screen.queryByTestId("thread")).not.toBeInTheDocument();
  });
  it("shows a recoverable error without an endless loading state", async () => {
    vi.mocked(fetchChatInbox).mockRejectedValueOnce(
      new Error("Связь потеряна"),
    );
    render(<ChatRequestPage requestId="request1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Повторить" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Межевание участка" }),
      ).toBeInTheDocument(),
    );
  });
});

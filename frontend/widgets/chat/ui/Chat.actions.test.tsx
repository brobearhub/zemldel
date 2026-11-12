import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chat } from "./Chat";

const message = {
  id: "message",
  conversationId: "conversation",
  senderUserId: "peer",
  senderName: "Анна",
  body: "Текст сообщения\nВторая строка",
  clientMessageId: "client",
  createdAt: "2026-11-12T09:00:00Z",
  repliedTo: {
    id: "quoted",
    senderUserId: "me",
    senderName: "Павел",
    bodySnippet: "Чужая цитата",
  },
};

function setup(mobile = false, readOnly = false) {
  vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
    matches: mobile,
    media,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  const onReply = vi.fn();
  const props = {
    rows: [{ kind: "message" as const, message }],
    currentUserId: "me",
    draft: "",
    onDraftChange: vi.fn(),
    pendingReply: null,
    onPendingReplyChange: vi.fn(),
    onSend: vi.fn(),
    onRetry: vi.fn(),
    onReplyToMessage: onReply,
    readOnly,
  };
  const view = render(<Chat {...props} />);
  return { ...view, props, onReply, writeText };
}

afterEach(() => vi.unstubAllGlobals());

describe("chat message actions", () => {
  it("replies to the selected message and copies only its text on desktop", async () => {
    const { onReply, writeText } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Ответить" }));
    expect(onReply).toHaveBeenCalledWith(message);
    fireEvent.click(screen.getByRole("button", { name: "Копировать" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(message.body));
    expect(await screen.findByRole("status")).toHaveTextContent("Текст скопирован");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens a mobile menu with icons and labels and closes after reply or copy", async () => {
    const { onReply, writeText } = setup(true);
    const row = screen.getByRole("button", { name: "Действия сообщения от Анна" });
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
    fireEvent.click(row, { clientX: 80, clientY: 120 });
    let menu = screen.getByRole("menu", { name: "Действия с сообщением" });
    const reply = within(menu).getByRole("menuitem", { name: "Ответить" });
    expect(reply.querySelector("svg")).toBeInTheDocument();
    fireEvent.click(reply);
    expect(onReply).toHaveBeenCalledWith(message);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());

    fireEvent.keyDown(row, { key: "Enter" });
    menu = screen.getByRole("menu");
    const copy = within(menu).getByRole("menuitem", { name: "Копировать" });
    expect(copy.querySelector("svg")).toBeInTheDocument();
    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(message.body));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("keeps copy available in read-only chats and reports clipboard failures", async () => {
    const { writeText, onReply } = setup(true, true);
    writeText.mockRejectedValueOnce(new Error("Clipboard access denied"));
    fireEvent.click(screen.getByRole("button", { name: "Действия сообщения от Анна" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByRole("menuitem", { name: "Ответить" })).not.toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Копировать" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось скопировать текст");
    expect(onReply).not.toHaveBeenCalled();
    expect(screen.queryByText("Текст скопирован")).not.toBeInTheDocument();
  });

  it("closes the menu if the message disappears from the current chat", async () => {
    const { rerender, props } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Действия сообщения от Анна" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    rerender(<Chat {...props} rows={[]} />);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});

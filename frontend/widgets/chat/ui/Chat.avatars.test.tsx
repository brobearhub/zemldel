import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chat, type ChatRenderableRow } from "./Chat";

const rows: ChatRenderableRow[] = [
  {
    kind: "message",
    message: {
      id: "own",
      conversationId: "conversation",
      senderUserId: "me",
      senderName: "Павел Усов",
      senderImage: "/avatars/old-me.png",
      body: "Моё сообщение",
      clientMessageId: "own-client",
      createdAt: "2026-11-12T09:00:00Z",
    },
  },
  {
    kind: "message",
    message: {
      id: "peer",
      conversationId: "conversation",
      senderUserId: "peer",
      senderName: "Руслан Иванов",
      senderImage: "/avatars/peer.png",
      body: "Ответ собеседника",
      clientMessageId: "peer-client",
      createdAt: "2026-11-12T09:01:00Z",
    },
  },
  {
    kind: "message",
    message: {
      id: "no-photo",
      conversationId: "conversation",
      senderUserId: "other",
      senderName: "Без Фото",
      senderImage: null,
      body: "Без фотографии",
      clientMessageId: "no-photo-client",
      createdAt: "2026-11-12T09:02:00Z",
    },
  },
  { kind: "pending", clientMessageId: "pending", body: "Отправляется" },
  {
    kind: "failed",
    clientMessageId: "failed",
    body: "Не отправлено",
    retryable: true,
  },
];

const props = {
  rows,
  currentUserId: "me",
  draft: "",
  onDraftChange: vi.fn(),
  pendingReply: null,
  onPendingReplyChange: vi.fn(),
  onSend: vi.fn(),
  onRetry: vi.fn(),
  onReplyToMessage: vi.fn(),
};

describe("chat message avatars", () => {
  it("shows participant photos, initials without a photo, and the current photo on outgoing messages", () => {
    const { container, rerender } = render(
      <Chat
        {...props}
        currentUserImage="/avatars/me.png"
      />,
    );

    const images = () =>
      [...container.querySelectorAll(".MuiAvatar-img")].map((image) =>
        image.getAttribute("src"),
      );
    expect(images()).toEqual([
      "/avatars/me.png",
      "/avatars/peer.png",
      "/avatars/me.png",
      "/avatars/me.png",
    ]);
    expect(screen.getByText("БФ")).toBeInTheDocument();

    rerender(<Chat {...props} />);
    expect(images()).toEqual(["/avatars/old-me.png", "/avatars/peer.png"]);
    expect(screen.getAllByText("В")).toHaveLength(2);
  });
});

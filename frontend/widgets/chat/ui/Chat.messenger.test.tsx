import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chat, type ChatRenderableRow } from "./Chat";
const row = (id: string, body: string): ChatRenderableRow => ({ kind: "message", message: { id, body, senderUserId: "peer", senderName: "Анна", conversationId: "a", clientMessageId: id, createdAt: "2026-11-10T07:40:00Z" } });
const base = { currentUserId: "actor", draft: "", onDraftChange: vi.fn(), pendingReply: null, onPendingReplyChange: vi.fn(), onSend: vi.fn(), onRetry: vi.fn(), onReplyToMessage: vi.fn(), appearance: "messenger" as const };
describe("messenger message history", () => {
  it("keeps the opening unread marker stable when more messages arrive", () => {
    const rows = [row("old", "Прочитанное"), row("new1", "Первый непрочитанный"), row("new2", "Второй непрочитанный")];
    const { rerender } = render(<Chat {...base} rows={rows} initialUnreadCount={2} />);
    const markerRow = () => screen.getByText("Новые сообщения").parentElement?.parentElement;
    expect(markerRow()).toHaveTextContent("Первый непрочитанный");
    rerender(<Chat {...base} rows={[...rows, row("new3", "Ещё одно")]} initialUnreadCount={0} />);
    expect(markerRow()).toHaveTextContent("Первый непрочитанный");
    expect(screen.getAllByText("Новые сообщения")).toHaveLength(1);
  });
  it("retains failed-message retry and prevents replies in read-only mode", () => {
    const retry = vi.fn();
    const rows: ChatRenderableRow[] = [row("a", "Сообщение"), { kind: "failed", clientMessageId: "failed-a", body: "Неотправленное", error: "Нет связи", retryable: true }];
    const { rerender } = render(<Chat {...base} rows={rows} onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(retry).toHaveBeenCalledWith("failed-a");
    rerender(<Chat {...base} rows={[rows[0]]} readOnly disabled />);
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
  });
});

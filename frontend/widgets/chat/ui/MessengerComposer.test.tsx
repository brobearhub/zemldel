import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessengerComposer } from "./MessengerComposer";

describe("MUI chat composer with existing outbox", () => {
  it("sends once via the supplied handler for click and Enter", () => {
    const send = vi.fn();
    const change = vi.fn();
    render(
      <MessengerComposer
        draft="Ответ клиенту"
        onDraftChange={change}
        onSend={send}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    expect(send).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Сообщение" }), {
      key: "Enter",
    });
    expect(send).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Сообщение" }), {
      key: "Enter",
      shiftKey: true,
    });
    expect(send).toHaveBeenCalledTimes(2);
    fireEvent.change(screen.getByRole("textbox", { name: "Сообщение" }), {
      target: { value: "Черновик" },
    });
    expect(change).toHaveBeenCalledWith("Черновик");
  });
  it("does not send while disabled, sending or blank, and respects composition", () => {
    const send = vi.fn();
    const change = vi.fn();
    const { rerender } = render(
      <MessengerComposer
        draft="Текст"
        onDraftChange={change}
        onSend={send}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
    rerender(
      <MessengerComposer
        draft="Текст"
        onDraftChange={change}
        onSend={send}
        sending
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Сообщение" }), {
      key: "Enter",
    });
    expect(send).not.toHaveBeenCalled();
    rerender(
      <MessengerComposer
        draft="   "
        onDraftChange={change}
        onSend={send}
      />,
    );
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
    rerender(
      <MessengerComposer
        draft="Текст"
        onDraftChange={change}
        onSend={send}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Сообщение" }), {
      key: "Enter",
      isComposing: true,
    });
    expect(send).not.toHaveBeenCalled();
  });
});

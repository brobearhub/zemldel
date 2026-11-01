import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatReadOnlyNotice } from "./ChatReadOnlyNotice";

describe("ChatReadOnlyNotice", () => {
  it("для архивного lock показывает русское пояснение и CTA без retry", () => {
    const onOpenSelectedConversation = vi.fn();

    render(
      <ChatReadOnlyNotice
        message="Этот диалог сохранён в архиве: заказчик выбрал другого исполнителя."
        reasonCode="CHAT_ARCHIVED_AFTER_PROVIDER_SELECTION"
        onOpenSelectedConversation={onOpenSelectedConversation}
      />,
    );

    expect(
      screen.getByText(
        "Этот диалог сохранён в архиве: заказчик выбрал другого исполнителя.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Повторить" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Перейти к выбранному исполнителю",
      }),
    );
    expect(onOpenSelectedConversation).toHaveBeenCalledOnce();
  });
});

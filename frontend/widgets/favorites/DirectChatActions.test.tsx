import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectChatActions } from "./DirectChatActions";
afterEach(() => vi.unstubAllGlobals());
describe("direct contact controls", () => {
  it("accepts a waiting contact without sending a message", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ directState: "ACTIVE" }),
    );
    vi.stubGlobal("fetch", fetcher);
    const changed = vi.fn();
    const view = render(
      <DirectChatActions
        conversationId="dialog"
        state="WAITING"
        onChange={changed}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Вступить в переписку" }),
    );
    expect(
      screen.getByRole("button", { name: "Отклонить обращение" }),
    ).toBeDisabled();
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe("/api/chat/conversations/dialog/state");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ action: "accept" });

    view.rerender(
      <DirectChatActions
        conversationId="dialog"
        state="ACTIVE"
        onChange={changed}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Вступить в переписку" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отклонить обращение" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Заблокировать" })).toBeEnabled();
  });

  it("keeps acceptance available when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ message: "Не удалось открыть переписку" }, { status: 500 }),
    ));
    const changed = vi.fn();
    render(
      <DirectChatActions
        conversationId="dialog"
        state="WAITING"
        onChange={changed}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Вступить в переписку" }),
    );
    expect(await screen.findByText("Не удалось открыть переписку")).toBeVisible();
    expect(changed).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Вступить в переписку" }),
    ).toBeEnabled();
  });

  it("lets a customer decline a waiting contact and refreshes the thread", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ directState: "DECLINED" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const changed = vi.fn();
    render(
      <DirectChatActions
        conversationId="dialog"
        state="WAITING"
        onChange={changed}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Отклонить обращение" }),
    );
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      action: "decline",
    });
  });
  it("shows an explicit resume action for a blocked conversation", () => {
    render(
      <DirectChatActions
        conversationId="dialog"
        state="BLOCKED"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Возобновить переписку" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Отклонить обращение" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Вступить в переписку" }),
    ).toBeNull();
  });
});

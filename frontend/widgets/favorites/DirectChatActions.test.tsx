import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectChatActions } from "./DirectChatActions";
afterEach(() => vi.unstubAllGlobals());
describe("direct contact controls", () => {
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
  });
});

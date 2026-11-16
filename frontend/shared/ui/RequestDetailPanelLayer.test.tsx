import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RequestDetailPanelLayer } from "./RequestDetailPanelLayer";

describe("RequestDetailPanelLayer", () => {
  it("does not render dialog when closed", () => {
    render(
      <RequestDetailPanelLayer
        open={false}
        title="Оплата"
        panel={<div>panel</div>}
        onClose={vi.fn()}
      >
        <div>child</div>
      </RequestDetailPanelLayer>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog when open and closes by button and Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <RequestDetailPanelLayer
        open
        title="Оплата"
        panel={<div>panel</div>}
        onClose={onClose}
      >
        <div>child</div>
      </RequestDetailPanelLayer>,
    );

    expect(screen.getByRole("dialog", { name: "Оплата" })).toHaveAttribute(
      "aria-modal",
      "false",
    );
    expect(screen.getByText("panel")).toBeInTheDocument();
    expect(screen.getByText("child").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("moves focus into the panel and returns it to the payment trigger", async () => {
    const user = userEvent.setup();
    function RequestCard() {
      const [open, setOpen] = useState(false);
      return (
        <RequestDetailPanelLayer
          open={open}
          title="Цена и оплата"
          panel={<div>Итог по заявке</div>}
          onClose={() => setOpen(false)}
        >
          <button onClick={() => setOpen(true)}>Оплата</button>
        </RequestDetailPanelLayer>
      );
    }
    render(<RequestCard />);
    const trigger = screen.getByRole("button", { name: "Оплата" });
    await user.click(trigger);
    expect(trigger).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Закрыть" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toBeVisible();
    expect(trigger).toHaveFocus();
  });
});

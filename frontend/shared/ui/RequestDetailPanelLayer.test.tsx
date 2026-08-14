import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequestDetailPanelLayer } from "./RequestDetailPanelLayer";

describe("RequestDetailPanelLayer", () => {
  it("does not render dialog when closed", () => {
    render(
      <RequestDetailPanelLayer open={false} title="Оплата" panel={<div>panel</div>} onClose={vi.fn()}>
        <div>child</div>
      </RequestDetailPanelLayer>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dialog when open and closes by button and Escape", () => {
    const onClose = vi.fn();
    render(
      <RequestDetailPanelLayer open title="Оплата" panel={<div>panel</div>} onClose={onClose}>
        <div>child</div>
      </RequestDetailPanelLayer>,
    );

    expect(screen.getByRole("dialog", { name: "Оплата" })).toBeInTheDocument();
    expect(screen.getByText("panel")).toBeInTheDocument();
    expect(screen.getByText("child").parentElement).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});


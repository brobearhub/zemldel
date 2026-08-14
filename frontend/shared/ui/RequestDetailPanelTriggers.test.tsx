import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RequestDetailPanelTriggers } from "./RequestDetailPanelTriggers";

describe("RequestDetailPanelTriggers", () => {
  it("renders only visible triggers and calls onOpen", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    render(
      <RequestDetailPanelTriggers
        items={[
          { id: "a", label: "A" },
          { id: "b", label: "B", visible: false },
        ]}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "B" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "A" }));
    expect(onOpen).toHaveBeenCalledWith("a");
  });
});


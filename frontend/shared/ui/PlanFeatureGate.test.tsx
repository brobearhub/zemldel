import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanFeatureGate, LITE_AND_BUSINESS } from "./PlanFeatureGate";

describe("tariff hints", () => {
  it("intercepts a locked control and provides a usable tariff link", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(
      <PlanFeatureGate
        message={LITE_AND_BUSINESS}
        label="Метка"
      >
        <button onClick={action}>Метка</button>
      </PlanFeatureGate>,
    );
    await user.click(screen.getByRole("button", { name: "Метка" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      LITE_AND_BUSINESS,
    );
    expect(
      screen.getByRole("link", { name: "Перейти к тарифам" }),
    ).toHaveAttribute("href", "/pro/settings/tariff");
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Метка"));
    expect(action).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });
  it("opens from the keyboard and allows the real action after upgrading", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <PlanFeatureGate
        message={LITE_AND_BUSINESS}
        label="Видео"
      >
        <button onClick={action}>Видео</button>
      </PlanFeatureGate>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("tooltip")).toBeVisible();
    expect(action).not.toHaveBeenCalled();
    rerender(
      <PlanFeatureGate
        message={null}
        label="Видео"
      >
        <button onClick={action}>Видео</button>
      </PlanFeatureGate>,
    );
    await user.click(screen.getByRole("button", { name: "Видео" }));
    expect(action).toHaveBeenCalledOnce();
  });
});

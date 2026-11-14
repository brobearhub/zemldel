import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderHeaderStatus } from "./ProviderHeaderStatus";
import { CabinetHeaderStatus } from "./CabinetHeaderStatus";
import { CustomerNotificationsButton } from "./CustomerNotificationsButton";

describe("provider header status", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("updates the clock and date at midnight without a request", () => {
    vi.setSystemTime(new Date(2026, 10, 8, 23, 59, 59, 500));
    render(<ProviderHeaderStatus />);

    expect(screen.getByText("23:59")).toBeInTheDocument();
    expect(screen.getByText("8 ноября 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Открыть напоминания" }),
    ).toHaveAttribute("href", "/pro/reminders");

    act(() => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("9 ноября 2026")).toBeInTheDocument();
  });

  it("pauses its timer in a hidden tab and catches up on return", () => {
    vi.setSystemTime(new Date(2026, 10, 8, 11, 59, 30));
    const { unmount } = render(<ProviderHeaderStatus />);

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByText("11:59")).toBeInTheDocument();

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText("12:01")).toBeInTheDocument();
    unmount();
  });

  it("shows the same updating time and date with customer notifications", () => {
    vi.setSystemTime(new Date(2026, 10, 8, 23, 59, 59, 500));
    render(<CabinetHeaderStatus notification={<CustomerNotificationsButton />} />);

    expect(screen.getByText("23:59")).toBeInTheDocument();
    expect(screen.getByText("8 ноября 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Документы и доступ к паспорту" }))
      .toHaveAttribute("href", "/profile?section=documents#passport-access");
    expect(screen.queryByRole("link", { name: "Открыть напоминания" })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(550);
    });

    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("9 ноября 2026")).toBeInTheDocument();
  });
});

vi.mock("@/core/store/hooks", () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { user: null } }) }));

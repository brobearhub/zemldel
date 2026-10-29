import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProRequestsFeed } from "./ProRequestsFeed";

vi.mock("@/widgets/pro-requests/model/useProRequestsFeed", () => ({
  useProRequestsFeed: () => ({
    statusChips: [],
    eligibleCategories: [],
    error: null,
    refresh: vi.fn(),
    settings: { status: "ALL", dialogScope: "ACTIVE" },
    setSettings: vi.fn(),
    itemsByStatus: { NEW: [], DISCUSSING: [] },
    archiveItems: [],
  }),
}));

vi.mock("@/widgets/pro-requests/ui/ProRequestsFeedHeader", () => ({
  ProRequestsFeedHeader: () => <div>header</div>,
}));

vi.mock("@/widgets/pro-requests/ui/ProRequestsFeedFilters", () => ({
  ProRequestsFeedFilters: ({ onToggleFreeform }: { onToggleFreeform: () => void }) => (
    <button type="button" onClick={onToggleFreeform}>
      toggle-freeform
    </button>
  ),
}));

vi.mock("@/widgets/pro-requests/ui/FeedColumn", () => ({
  FeedColumn: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/widgets/pro-requests/ui/ServiceRequestList", () => ({
  ServiceRequestList: () => <div>service-list</div>,
}));

describe("ProRequestsFeed", () => {
  it("показывает empty-state для фильтра свободных заявок", () => {
    render(<ProRequestsFeed initialItems={[]} initialOrders={[]} />);

    expect(screen.queryByText("Пока нет свободных заявок. Они появятся здесь, когда заказчики создадут новые обращения.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "toggle-freeform" }));

    expect(screen.getByText("Пока нет свободных заявок. Они появятся здесь, когда заказчики создадут новые обращения.")).toBeInTheDocument();
  });
});

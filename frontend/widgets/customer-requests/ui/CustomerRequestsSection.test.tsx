import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestsSection } from "./CustomerRequestsSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/shared/ui/confirm", () => ({ useConfirm: () => vi.fn() }));

vi.mock("./CustomerRequestReplyDialog", () => ({
  CustomerRequestReplyDialog: () => null,
}));

vi.mock("./CustomerRequestsFeed", () => ({
  CustomerRequestsFeed: ({ items }: { items: RequestCustomerDto[] }) => (
    <div data-testid="customer-feed">
      {items.map((item) => <span key={item.id}>{item.id}</span>)}
    </div>
  ),
}));

describe("CustomerRequestsSection status filters", () => {
  it("показывает все заявки по умолчанию и переключает статусы чипами", async () => {
    const user = userEvent.setup();
    const items = [
      { id: "new-request", status: "NEW" },
      { id: "discussing-request", status: "DISCUSSING" },
      { id: "done-request", status: "COMPLETED" },
    ] as RequestCustomerDto[];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => items,
    }));

    render(<CustomerRequestsSection />);

    const filters = await screen.findByRole("group", {
      name: "Фильтр заявок по статусу",
    });
    const feed = screen.getByTestId("customer-feed");
    expect(within(filters).getByRole("button", { name: "Все" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(within(feed).getAllByText(/-request/)).toHaveLength(3);
    expect(within(filters).queryByRole("button", { name: "В работе" }))
      .not.toBeInTheDocument();

    await user.click(within(filters).getByRole("button", { name: "Обсуждение" }));
    expect(within(feed).getByText("discussing-request")).toBeInTheDocument();
    expect(within(feed).queryByText("new-request")).not.toBeInTheDocument();
    expect(within(filters).getByRole("button", { name: "Обсуждение" }))
      .toHaveAttribute("aria-pressed", "true");

    await user.click(within(filters).getByRole("button", { name: "Все" }));
    expect(within(feed).getAllByText(/-request/)).toHaveLength(3);
  });
});

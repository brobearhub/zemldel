import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestsSection } from "./CustomerRequestsSection";
import { CustomerRequestDeleteConflictError } from "@/entities/request/api/customer-requests";

const actions = vi.hoisted(() => ({ confirm: vi.fn(), remove: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/shared/ui/confirm", () => ({ useConfirm: () => actions.confirm }));
vi.mock("@/entities/request/api/customer-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/request/api/customer-requests")>()),
  deleteCustomerRequest: actions.remove,
}));

vi.mock("./CustomerRequestReplyDialog", () => ({
  CustomerRequestReplyDialog: () => null,
}));

vi.mock("./CustomerRequestsFeed", () => ({
  CustomerRequestsFeed: ({ items, onDelete }: { items: RequestCustomerDto[]; onDelete: (item: RequestCustomerDto) => void }) => (
    <div data-testid="customer-feed">
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.id}</span>
          {item.canDeleteByCustomer ? <button onClick={() => onDelete(item)}>Удалить заявку</button> : null}
        </div>
      ))}
    </div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("CustomerRequestsSection status filters", () => {
  it("показывает старые заявки и обновляет открытый список при создании новой", async () => {
    const user = userEvent.setup();
    const cursor = "2026-01-01T00:00:00.000Z,older";
    const recent = [{ id: "recent-request", status: "DISCUSSING" }];
    const earlier = [{ id: "earlier-request", status: "COMPLETED" }];
    const fetchPage = vi.fn(async (path: string) =>
      path === "/api/requests"
        ? { ok: true, headers: new Headers({ "x-next-cursor": cursor }), json: async () => recent }
        : { ok: true, headers: new Headers(), json: async () => earlier },
    );
    vi.stubGlobal("fetch", fetchPage);
    render(<CustomerRequestsSection />);
    await user.click(await screen.findByRole("button", { name: "Показать ещё заявки" }));
    expect(await screen.findByText("earlier-request")).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledWith(`/api/requests?before=${encodeURIComponent(cursor)}`, expect.anything());
    recent.unshift({ id: "new-request", status: "DISCUSSING" });
    act(() => window.dispatchEvent(new CustomEvent("request:changed", { detail: { requestId: "new-request" } })));
    expect(await screen.findByText("new-request")).toBeInTheDocument();
    expect(screen.getByText("earlier-request")).toBeInTheDocument();
  });

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

describe("удаление заявки по услуге", () => {
  const item = { id: "service-request", subjectType: "SERVICE", status: "NEW", canDeleteByCustomer: true } as RequestCustomerDto;

  function mockRequestList() {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [item] }));
  }

  it("не удаляет заявку при отмене подтверждения", async () => {
    const user = userEvent.setup();
    mockRequestList();
    actions.confirm.mockResolvedValue(false);
    render(<CustomerRequestsSection />);
    await user.click(await screen.findByRole("button", { name: "Удалить заявку" }));
    expect(actions.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Удалить заявку?" }));
    expect(actions.remove).not.toHaveBeenCalled();
    expect(screen.getByText("service-request")).toBeInTheDocument();
  });

  it("после подтверждения удаляет заявку из ленты", async () => {
    const user = userEvent.setup();
    mockRequestList();
    actions.confirm.mockResolvedValue(true);
    actions.remove.mockResolvedValue({ ok: true });
    render(<CustomerRequestsSection />);
    await user.click(await screen.findByRole("button", { name: "Удалить заявку" }));
    expect(actions.remove).toHaveBeenCalledWith("service-request");
    await waitFor(() => expect(screen.queryByText("service-request")).not.toBeInTheDocument());
  });

  it("оставляет заявку и показывает ошибку, если сервер запретил удаление", async () => {
    const user = userEvent.setup();
    mockRequestList();
    actions.confirm.mockResolvedValue(true);
    actions.remove.mockRejectedValue(new CustomerRequestDeleteConflictError());
    render(<CustomerRequestsSection />);
    const button = await screen.findByRole("button", { name: "Удалить заявку" });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...item, status: "DISCUSSING", canDeleteByCustomer: false }],
    } as Response);
    await user.click(button);
    expect(await screen.findByText("Заявку уже нельзя удалить. Возможно, исполнитель уже ответил.")).toBeInTheDocument();
    expect(screen.getByText("service-request")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить заявку" })).not.toBeInTheDocument();
  });
});

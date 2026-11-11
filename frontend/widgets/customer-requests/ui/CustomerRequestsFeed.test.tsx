import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestsFeed } from "./CustomerRequestsFeed";

vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (selector: (state: { auth: { user: null } }) => unknown) =>
    selector({ auth: { user: null } }),
}));

function request(overrides: Partial<RequestCustomerDto> = {}): RequestCustomerDto {
  return {
    id: "request-1",
    status: "DISCUSSING",
    subjectType: "SERVICE",
    serviceTitle: "Межевание участка",
    categoryName: null,
    message: "Нужно уточнить границы",
    location: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    requestCity: null,
    customerName: null,
    providerName: "Исполнитель",
    providerImage: null,
    providerLastMessage: "Могу приехать завтра",
    customerLastMessage: null,
    awaitingProviderReply: false,
    totalAmountRubles: null,
    servicePriceRubles: null,
    priceProposal: null,
    lockedAt: null,
    canDeleteByCustomer: false,
    ...overrides,
  } as RequestCustomerDto;
}

describe("CustomerRequestsFeed", () => {
  it("открывает клиентскую заявку и отвечает прямо из строки исполнителя", async () => {
    const user = userEvent.setup();
    const item = request({ serviceId: "service-1", servicePriceRubles: 12000 });
    const onReply = vi.fn();

    render(
      <CustomerRequestsFeed
        items={[item]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={onReply}
      />,
    );

    const link = screen.getByRole("link", { name: /Межевание участка/i });
    expect(link).toHaveAttribute("href", "/profile/requests/request-1");
    expect(within(link).getByText("Обсуждение")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Услуга" })).toHaveAttribute(
      "href",
      "/services/service-1",
    );
    expect(screen.getByText(/Справочная цена услуги/)).toBeInTheDocument();
    expect(screen.getByText("Могу приехать завтра")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ответить" }));
    expect(onReply).toHaveBeenCalledWith(item);
  });

  it("удаляет доступную заявку отдельно от ссылки и показывает ожидание ответа", async () => {
    const user = userEvent.setup();
    const item = request({
      awaitingProviderReply: true,
      customerLastMessage: "До встречи",
      canDeleteByCustomer: true,
    });
    const onDelete = vi.fn();

    render(
      <CustomerRequestsFeed
        items={[item]}
        deletingId={null}
        sendingId={null}
        onDelete={onDelete}
        onReply={vi.fn()}
      />,
    );

    expect(screen.getByText("Ждем ответ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Удалить заявку" }));
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  it("не открывает закрытую заявку", async () => {
    const user = userEvent.setup();

    render(
      <CustomerRequestsFeed
        items={[request({ status: "CLOSED" })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: /Межевание участка/i });
    expect(link).toHaveAttribute("aria-disabled", "true");
    await user.click(link);
    expect(window.location.pathname).not.toBe("/profile/requests/request-1");
    expect(screen.queryByText("Могу приехать завтра")).not.toBeInTheDocument();
  });
});

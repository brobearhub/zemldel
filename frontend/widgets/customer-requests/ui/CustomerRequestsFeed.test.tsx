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
  it("показывает в новой заявке фактически отправленное сообщение, если поле заявки было пустым", () => {
    const greeting = "Здравствуйте! Хочу обсудить мою задачу и дальнейшие шаги.";
    render(
      <CustomerRequestsFeed
        items={[request({
          subjectType: "SERVICE",
          status: "NEW",
          message: null,
          customerLastMessage: greeting,
          providerLastMessage: null,
          awaitingProviderReply: true,
        })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText(greeting)).toBeVisible();
    expect(screen.getByText("Ждем ответ")).toBeVisible();
  });

  it("не подставляет приветствие в заявку без отправленного сообщения", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ status: "NEW", message: null, customerLastMessage: null, providerLastMessage: null, awaitingProviderReply: false })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Здравствуйте! Хочу обсудить мою задачу/)).not.toBeInTheDocument();
  });

  it("показывает город рядом с исполнителем, а не с названием заявки", () => {
    render(
      <CustomerRequestsFeed
        items={[request({
          providerName: "ООО Бурый Медведь",
          requestCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("ООО Бурый Медведь").closest("p")).toHaveTextContent(
      "ООО Бурый Медведь · Екатеринбург",
    );
    expect(screen.getByText("Межевание участка").closest("p")).not.toHaveTextContent("Екатеринбург");
  });

  it("сохраняет город, когда исполнитель не выбран", () => {
    render(
      <CustomerRequestsFeed
        items={[request({
          subjectType: "FREEFORM",
          providerName: null,
          requestCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("Екатеринбург")).toBeVisible();
  });

  it("показывает ожидание ответа в новой заявке с отправленным сообщением", () => {
    render(
      <CustomerRequestsFeed
        items={[request({
          subjectType: "SERVICE",
          status: "NEW",
          serviceId: "service-1",
          message: "Здравствуйте! Хочу обсудить задачу.",
          customerLastMessage: "Здравствуйте! Хочу обсудить задачу.",
          providerLastMessage: null,
          awaitingProviderReply: true,
          canDeleteByCustomer: true,
        })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("Ждем ответ")).toBeVisible();
    expect(screen.getByText("Здравствуйте! Хочу обсудить задачу.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Удалить заявку" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
  });

  it("не показывает ожидание в новой заявке, если нет отправленного сообщения", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ status: "NEW", message: null, customerLastMessage: null, providerLastMessage: null, awaitingProviderReply: false })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.queryByText("Ждем ответ")).not.toBeInTheDocument();
  });

  it.each([
    { status: "NEW" as const, message: "Здравствуйте! Хочу обсудить задачу.", providerLastMessage: null },
    { status: "NEW" as const, message: null, providerLastMessage: null },
    { status: "DISCUSSING" as const, message: "Здравствуйте!", providerLastMessage: "Могу помочь" },
  ])("показывает имя исполнителя независимо от сообщения и ответа: $status", (values) => {
    render(
      <CustomerRequestsFeed
        items={[request({ ...values, providerName: "ООО Бурый Медведь" })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("ООО Бурый Медведь")).toBeVisible();
    if (values.status === "NEW" && values.message) {
      expect(screen.getByText(values.message)).toBeVisible();
    }
    if (values.providerLastMessage) {
      expect(screen.getByText(values.providerLastMessage)).toBeVisible();
    }
  });

  it("не придумывает исполнителя для свободной заявки без выбранного провайдера", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ subjectType: "FREEFORM", providerId: null, providerName: null })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.queryByText("ООО Бурый Медведь")).not.toBeInTheDocument();
  });

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
    expect(screen.getByText(/^12\s*000\s*₽$/)).toBeInTheDocument();
    expect(screen.getByText(/^12\s*000\s*₽$/).parentElement).toContainElement(
      screen.getByRole("link", { name: "Услуга" }),
    );
    expect(link).not.toContainElement(screen.getByRole("link", { name: "Услуга" }));
    expect(screen.queryByText("Цена работ не указана")).not.toBeInTheDocument();
    expect(screen.queryByText(/Справочная цена услуги/)).not.toBeInTheDocument();
    expect(screen.getByText("Могу приехать завтра")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ответить" }));
    expect(onReply).toHaveBeenCalledWith(item);
  });

  it("показывает цену работ после её установки исполнителем", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ totalAmountRubles: 15000, servicePriceRubles: 12000 })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText(/^15\s*000\s*₽$/)).toBeInTheDocument();
    expect(screen.queryByText(/Цена работ:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Справочная цена услуги/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Предварительная цена/)).not.toBeInTheDocument();
  });

  it("оставляет отсутствие цены для свободной заявки без стоимости", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ subjectType: "FREEFORM", servicePriceRubles: null })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("Цена работ не указана")).toBeInTheDocument();
    expect(screen.getByText("Цена работ не указана").parentElement).toHaveTextContent(
      "Цена работ не указана · Свободная заявка",
    );
  });

  it("показывает заявку по категории как свободную", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ subjectType: "CATEGORY", serviceId: null, servicePriceRubles: null })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByText("Свободная заявка")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Услуга" })).not.toBeInTheDocument();
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

  it("показывает отдельные действия для услуги и удаления заявки до ответа", async () => {
    const user = userEvent.setup();
    const item = request({
      status: "NEW",
      serviceId: "service-1",
      canDeleteByCustomer: true,
      awaitingProviderReply: true,
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
    const serviceLink = screen.getByRole("link", { name: "Услуга" });
    const deleteButton = screen.getByRole("button", { name: "Удалить заявку" });
    expect(serviceLink).toHaveAttribute("href", "/services/service-1");
    expect(serviceLink).not.toContainElement(deleteButton);
    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(item);
    expect(window.location.pathname).not.toBe("/profile/requests/request-1");
  });

  it("не показывает удаление заявки по услуге, когда сервер его запрещает", () => {
    render(
      <CustomerRequestsFeed
        items={[request({ serviceId: "service-1", canDeleteByCustomer: false })]}
        deletingId={null}
        sendingId={null}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "Услуга" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить заявку" })).not.toBeInTheDocument();
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

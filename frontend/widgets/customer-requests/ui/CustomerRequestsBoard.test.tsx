import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestsBoard } from "./CustomerRequestsBoard";

vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (
    selector: (state: { auth: { user: { image: string | null; name: string | null } | null } }) => unknown,
  ) => selector({ auth: { user: { image: "https://cdn.example/me.jpg", name: "Валерия" } } }),
}));

function request(overrides: Partial<RequestCustomerDto> & Pick<RequestCustomerDto, "id" | "status">): RequestCustomerDto {
  return {
    subjectType: "FREEFORM",
    serviceId: null,
    categoryId: null,
    message: "Текст заявки",
    location: null,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    selectedProviderIds: [],
    declinedProviderIds: [],
    lastSelectionAt: null,
    offers: [],
    requestCityId: null,
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: null,
    serviceTitle: null,
    serviceImage: null,
    categoryName: null,
    providerName: null,
    providerPhone: null,
    providerEmail: null,
    providerImage: null,
    customerName: null,
    customerEmail: null,
    customerUserId: null,
    createdAt: "2026-10-05T17:25:00.000Z",
    updatedAt: "2026-10-05T17:25:00.000Z",
    totalAmountRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    canDeleteByCustomer: false,
    providerLastMessage: null,
    customerLastMessage: null,
    awaitingProviderReply: false,
    ...overrides,
  };
}

describe("CustomerRequestsBoard", () => {
  it("renders status columns and opens a request on card click", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const openItem = request({
      id: "new-1",
      status: "NEW",
      subjectType: "SERVICE",
      message: "Сделай красиво",
      serviceTitle: "Межевание участка",
      serviceImage: "https://cdn.example/service.jpg",
    });
    const freeform = request({
      id: "closed-1",
      status: "CLOSED",
      message: "Старая заявка",
      serviceImage: "https://cdn.example/ignored.jpg",
    });

    render(
      <CustomerRequestsBoard
        items={[openItem, freeform]}
        deletingId={null}
        onOpen={onOpen}
        onDelete={onDelete}
        onReply={vi.fn()}
      />
    );

    expect(screen.getByText("Новая · 1")).toBeInTheDocument();
    expect(screen.getByText("Заявка закрыта · 1")).toBeInTheDocument();
    expect(screen.queryByText("Обсуждение · 0")).not.toBeInTheDocument();
    expect(screen.getByText("Межевание участка")).toBeInTheDocument();
    expect(screen.queryByText("Сделай красиво")).not.toBeInTheDocument();
    expect(screen.getByText("Старая заявка")).toBeInTheDocument();
    expect(screen.getAllByText(/день|дня|дней/).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="https://cdn.example/service.jpg"]')).not.toBeNull();
    expect(document.querySelector('img[src="https://cdn.example/ignored.jpg"]')).toBeNull();
    expect(document.querySelector('img[src="/hero-bg-house_static_day.jpg"]')).not.toBeNull();

    await user.click(screen.getByRole("link", { name: /Межевание участка/i }));
    expect(onOpen).toHaveBeenCalledWith(openItem);
  });

  it("deletes without opening the request", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const deletable = request({
      id: "new-2",
      status: "NEW",
      message: "Удаляемая заявка",
      canDeleteByCustomer: true,
    });

    render(
      <CustomerRequestsBoard items={[deletable]} deletingId={null} onOpen={onOpen} onDelete={onDelete} onReply={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Удалить заявку" }));
    expect(onDelete).toHaveBeenCalledWith(deletable);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("replies without opening the request", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onReply = vi.fn();
    const discussing = request({
      id: "discuss-1",
      status: "DISCUSSING",
      subjectType: "SERVICE",
      serviceTitle: "Подключение электричества",
      providerLastMessage: "Могу выехать завтра",
    });

    render(
      <CustomerRequestsBoard items={[discussing]} deletingId={null} onOpen={onOpen} onDelete={vi.fn()} onReply={onReply} />
    );

    await user.click(screen.getByRole("button", { name: "Ответить" }));
    expect(onReply).toHaveBeenCalledWith(discussing);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("shows a waiting status after the customer already replied", () => {
    const discussing = request({
      id: "discuss-1",
      status: "DISCUSSING",
      subjectType: "SERVICE",
      serviceTitle: "Подключение электричества",
      providerLastMessage: "Могу выехать завтра",
      awaitingProviderReply: true,
    });

    render(
      <CustomerRequestsBoard items={[discussing]} deletingId={null} onOpen={vi.fn()} onDelete={vi.fn()} onReply={vi.fn()} />
    );

    expect(screen.getByText("Ждем ответ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
    expect(screen.getByText("Могу выехать завтра")).toBeInTheDocument();
  });

  it("shows the provider reply only on a discussing card", () => {
    const discussing = request({
      id: "discuss-1",
      status: "DISCUSSING",
      subjectType: "SERVICE",
      serviceTitle: "Подключение электричества",
      providerLastMessage: "Могу выехать завтра",
    });
    const fresh = request({
      id: "new-3",
      status: "NEW",
      subjectType: "SERVICE",
      serviceTitle: "Раздел имущества",
      providerLastMessage: "Это не должно быть видно",
    });
    const silent = request({
      id: "discuss-2",
      status: "DISCUSSING",
      subjectType: "FREEFORM",
      message: "свободная форма отзывы",
      providerLastMessage: null,
    });

    render(
      <CustomerRequestsBoard
        items={[discussing, fresh, silent]}
        deletingId={null}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onReply={vi.fn()}
      />
    );

    const discussingCard = screen.getByRole("link", { name: "Подключение электричества" });
    expect(within(discussingCard).getByText("Могу выехать завтра")).toBeInTheDocument();
    expect(within(discussingCard).getByRole("separator")).toBeInTheDocument();
    expect(screen.queryByText("Это не должно быть видно")).not.toBeInTheDocument();
    const silentCard = screen.getByRole("link", { name: "свободная форма отзывы" });
    expect(within(silentCard).queryByRole("separator")).not.toBeInTheDocument();
  });

  it("в «Ответить» показывает только последнее сообщение исполнителя", () => {
    const discussing = request({
      id: "discuss-1",
      status: "DISCUSSING",
      subjectType: "SERVICE",
      serviceTitle: "Подключение электричества",
      customerLastMessage: "За 1000 сделаешь?",
      providerLastMessage: "Могу выехать завтра",
    });

    render(
      <CustomerRequestsBoard items={[discussing]} deletingId={null} onOpen={vi.fn()} onDelete={vi.fn()} onReply={vi.fn()} />
    );

    const card = screen.getByRole("link", { name: "Подключение электричества" });
    expect(within(card).getByText("Могу выехать завтра")).toBeInTheDocument();
    expect(within(card).queryByText("За 1000 сделаешь?")).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Ответить" })).toBeInTheDocument();
  });

  it("в «Ждем ответ» показывает сообщение исполнителя и свой ответ", () => {
    const discussing = request({
      id: "discuss-1",
      status: "DISCUSSING",
      subjectType: "SERVICE",
      serviceTitle: "Подключение электричества",
      customerLastMessage: "А когда сможете?",
      providerLastMessage: "Могу выехать завтра",
      awaitingProviderReply: true,
    });

    render(
      <CustomerRequestsBoard items={[discussing]} deletingId={null} onOpen={vi.fn()} onDelete={vi.fn()} onReply={vi.fn()} />
    );

    const card = screen.getByRole("link", { name: "Подключение электричества" });
    const question = within(card).getByText("Могу выехать завтра");
    const answer = within(card).getByText("А когда сможете?");
    expect(within(card).getByRole("img", { name: "Валерия" })).toBeInTheDocument();
    expect(question.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card).getByText("Ждем ответ")).toBeInTheDocument();
  });
});

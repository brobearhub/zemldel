import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestListFeed } from "../lib/request-list-cache";
import type { RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { legalService, mainService } from "@/tests/fixtures/services";
import { ProMyServicesSection } from "./ProMyServicesSection";
import { ServiceRequestRow } from "./ServiceRequestRow";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";
import {
  clearRequestFeedRateLimit,
  RequestFeedRateLimitError,
  setRequestFeedRetryAfter,
} from "../lib/request-feed-rate-limit";

const { fetchRequestList, readRequestListCache, writeRequestListCache, invalidateRequestListCache, replyToRequestCustomer } = vi.hoisted(() => ({
  fetchRequestList: vi.fn(),
  readRequestListCache: vi.fn((): RequestListFeed | null => null),
  writeRequestListCache: vi.fn(),
  invalidateRequestListCache: vi.fn(),
  replyToRequestCustomer: vi.fn(),
}));

vi.mock("../lib/fetch-request-list", () => ({
  fetchRequestList: async (...args: unknown[]) => {
    const result = await fetchRequestList(...args);
    const items = result.items.filter((item: RequestProDto) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(item.status));
    return { total: items.length, needsReply: items.filter((item: RequestProDto) => !item.awaitingCustomerReply).length, hasMore: false, nextCursor: null, ...result, items };
  },
}));

vi.mock("../lib/reply-to-customer", () => ({
  replyToRequestCustomer,
}));

vi.mock("../lib/request-list-cache", () => ({
  readRequestListCache,
  writeRequestListCache,
  invalidateRequestListCache,
}));

vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (
    selector: (state: { auth: { user: { image: string | null; name: string | null } | null } }) => unknown,
  ) => selector({ auth: { user: { image: "https://cdn.example/me.jpg", name: "Валерия" } } }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function request(overrides: Partial<RequestProDto> = {}): RequestProDto {
  return {
    id: "r1",
    number: null,
    subjectType: "SERVICE" satisfies RequestSubjectType,
    serviceId: "svc",
    serviceTitle: "Подключение",
    categoryId: null,
    categoryName: null,
    message: null,
    location: null,
    status: "NEW" satisfies RequestStatus,
    providerId: null,
    dealTerms: null,
    offerVersion: null,
    termsVersion: null,
    contractAcceptedAt: null,
    acceptanceRequestedAt: null,
    autoAcceptAt: null,
    acceptedAt: null,
    offerStatus: null,
    offerSelectedAt: null,
    offerDeclinedAt: null,
    requestCityId: null,
    requestCity: null,
    fiasInactiveWarning: false,
    lockedAt: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerImage: null,
    conversationsCount: 0,
    isLocked: false,
    customerLastMessage: null,
    providerLastMessage: null,
    awaitingCustomerReply: false,
    lastMessageAt: null,
    totalAmountRubles: null,
    servicePriceRubles: null,
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    createdAt: "2026-10-06T10:00:00.000Z",
    updatedAt: "2026-10-06T10:00:00.000Z",
    currentSubmission: null,
    deliverySubmissions: [],
    priceProposal: null,
    canProposePrice: false,
    canAcceptPrice: false,
    ...overrides,
  };
}

describe("ServiceRequestsPanel", () => {
  beforeEach(() => {
    clearRequestFeedRateLimit();
    fetchRequestList.mockReset();
    readRequestListCache.mockReset();
    writeRequestListCache.mockReset();
    invalidateRequestListCache.mockReset();
    replyToRequestCustomer.mockReset();
    readRequestListCache.mockReturnValue(null);
    replyToRequestCustomer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    clearRequestFeedRateLimit();
  });

  it.each(["svc", null])("показывает предупреждение с таймером, сохраняет строки и разрешает дозагрузку после ожидания: %s", async (serviceId) => {
    const first = [request({ id: "first", number: 1 })];
    const next = request({ id: "next", number: 2 });
    fetchRequestList.mockResolvedValueOnce({ items: first, hasMore: true, nextCursor: "next" })
      .mockImplementationOnce(() => {
        setRequestFeedRetryAfter(10);
        throw new RequestFeedRateLimitError();
      })
      .mockResolvedValueOnce({ items: [next], hasMore: false });
    render(<ServiceRequestsPanel serviceId={serviceId} />);
    const more = await screen.findByRole("button", { name: "Ещё" });

    vi.useFakeTimers();
    await act(async () => fireEvent.click(more));
    expect(screen.getByText("Подождите немного")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("Повторить можно через 0:10");
    expect(more).toBeDisabled();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole("timer")).toHaveTextContent("Повторить можно через 0:05");
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("Ожидание закончилось. Можно снова загружать заявки.")).toBeInTheDocument();
    expect(more).toBeEnabled();
    expect(fetchRequestList).toHaveBeenCalledTimes(2);

    await act(async () => fireEvent.click(more));
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByText("Можно продолжить")).not.toBeInTheDocument();
  });

  it("показывает минутное ожидание при первой загрузке и разрешает повторить её после таймера", async () => {
    vi.useFakeTimers();
    fetchRequestList.mockImplementationOnce(() => {
      setRequestFeedRetryAfter(60);
      throw new RequestFeedRateLimitError();
    }).mockResolvedValueOnce({ items: [request()] });
    render(<ServiceRequestsPanel serviceId="svc" />);
    await act(async () => vi.advanceTimersByTime(0));
    expect(screen.getByText("Подождите немного")).toBeInTheDocument();
    expect(screen.queryByText("Загрузка…")).not.toBeInTheDocument();
    expect(screen.queryByText("Пока нет заявок")).not.toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("1:00");
    const retry = screen.getByRole("button", { name: "Повторить" });
    expect(retry).toBeDisabled();

    await act(async () => vi.advanceTimersByTime(60_000));
    expect(retry).toBeEnabled();
    await act(async () => fireEvent.click(retry));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("показывает порядковый номер в общей строке заявки клиента и исполнителя", () => {
    const item = request({ id: "request-uuid", number: 27 });
    const view = render(
      <ServiceRequestRow
        request={item}
        title="Подключение"
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByRole("link")).toHaveTextContent("№ 27 · Подключение");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pro/requests/request-uuid");
    view.rerender(
      <ServiceRequestRow
        request={item}
        title="Подключение"
        customerView
        onReply={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /№ 27 · Подключение/ })).toHaveAttribute("href", "/profile/requests/request-uuid");
  });

  it("запрашивает заявки услуги и не показывает завершённые", async () => {
    fetchRequestList.mockResolvedValue({
      items: [request({ id: "new" }), request({ id: "done", status: "COMPLETED" })],
    });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);

    expect(await screen.findByRole("heading", { name: "Заявки" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Фильтр заявок" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*1/);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText("Заявка выполнена")).not.toBeInTheDocument();
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: "svc", search: "", limit: 3 });
  });

  it.each(["svc", null])("загружает 3, затем порции по 5 и скрывает кнопку после последней страницы: %s", async (serviceId) => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 16 }, (_, index) => request({ id: `r${index}`, number: index + 1 }));
    fetchRequestList.mockResolvedValueOnce({ items: rows.slice(0, 3), total: 16, hasMore: true, nextCursor: "page-2" })
      .mockResolvedValueOnce({ items: rows.slice(3, 8), total: 16, hasMore: true, nextCursor: "page-3" })
      .mockResolvedValueOnce({ items: rows.slice(8, 13), total: 16, hasMore: true, nextCursor: "page-4" })
      .mockResolvedValueOnce({ items: rows.slice(13), total: 16, hasMore: false, nextCursor: null });
    render(<ServiceRequestsPanel serviceId={serviceId} />);
    expect(await screen.findAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent("16");
    for (const [index, count] of [8, 13, 16].entries()) {
      await user.click(screen.getByRole("button", { name: "Ещё" }));
      await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(count));
      expect(fetchRequestList).toHaveBeenLastCalledWith({ serviceId, search: "", limit: 5, cursor: `page-${index + 2}` }, expect.any(Number), true);
    }
    expect(screen.queryByRole("button", { name: "Ещё" })).not.toBeInTheDocument();
    expect(fetchRequestList).toHaveBeenCalledTimes(4);
  });

  it("повторяет неудачную страницу и не дублирует загрузку по двойному клику", async () => {
    fetchRequestList.mockResolvedValueOnce({ items: [request()], hasMore: true, nextCursor: "next", total: 4 });
    render(<ServiceRequestsPanel serviceId="svc" />);
    await screen.findByRole("link");
    fetchRequestList.mockRejectedValueOnce(new Error("Нет соединения"));
    await userEvent.click(screen.getByRole("button", { name: "Ещё" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Нет соединения");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    let resolve!: (value: { items: RequestProDto[] }) => void;
    fetchRequestList.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const more = screen.getByRole("button", { name: "Ещё" });
    fireEvent.click(more);
    fireEvent.click(more);
    expect(more).toBeDisabled();
    expect(fetchRequestList).toHaveBeenCalledTimes(3);
    await act(async () => resolve({ items: [request({ id: "r2" })] }));
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ещё" })).not.toBeInTheDocument();
  });

  it("при обновлении не открывает следующую страницу вместо закрытых заявок", async () => {
    fetchRequestList.mockResolvedValueOnce({ items: [request({ id: "a" }), request({ id: "b" }), request({ id: "c" })], total: 5, hasMore: true, nextCursor: "next" });
    render(<ServiceRequestsPanel serviceId="svc" />);
    expect(await screen.findAllByRole("link")).toHaveLength(3);
    fetchRequestList.mockResolvedValueOnce({ items: [request({ id: "b" }), request({ id: "c" })], total: 4, hasMore: true, nextCursor: "next" });
    await act(async () => { window.dispatchEvent(new Event("request:changed")); });
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(fetchRequestList).toHaveBeenCalledTimes(2);
    expect(fetchRequestList).toHaveBeenLastCalledWith({ serviceId: "svc", search: "", limit: 3 }, expect.any(Number), true);
    expect(screen.getByRole("button", { name: "Ещё" })).toBeVisible();
  });

  it("при пустом ответе показывает пустое состояние и ноль", async () => {
    fetchRequestList.mockResolvedValue({ items: [] });

    render(<ServiceRequestsPanel serviceId={null} emptyLabel="Пока нет свободных заявок" />);

    expect(await screen.findByText("Пока нет свободных заявок")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Фильтр заявок" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*0/);
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: null, search: "", limit: 3 }, expect.any(Number), true);
  });

  it("передаёт поиск серверу, сбрасывает страницу и игнорирует запоздалую дозагрузку", async () => {
    fetchRequestList.mockResolvedValueOnce({ items: [request({ number: 1 })], total: 24, hasMore: true, nextCursor: "next" });
    const onSummary = vi.fn();
    render(<ServiceRequestsPanel serviceId="svc" onSummary={onSummary} titleFor={(item) => item.customerName ?? "Заявка"} />);
    await screen.findByRole("link");
    let resolveOld!: (value: { items: RequestProDto[] }) => void;
    fetchRequestList.mockReturnValueOnce(new Promise((done) => { resolveOld = done; }));
    await userEvent.click(screen.getByRole("button", { name: "Ещё" }));
    fetchRequestList.mockResolvedValueOnce({ items: [request({ id: "hidden", number: 127, customerName: "Артём Соколов" })] });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "СОКОЛ" } });
    expect(await screen.findByRole("link", { name: /№ 127 · Артём Соколов/ })).toBeVisible();
    expect(fetchRequestList).toHaveBeenLastCalledWith({ serviceId: "svc", search: "СОКОЛ", limit: 3 });
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent("1 из 24");
    await act(async () => resolveOld({ items: [request({ id: "old-page", number: 99 })] }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(onSummary).toHaveBeenLastCalledWith("svc", { count: 24, needsReply: 1 });

    fetchRequestList.mockResolvedValueOnce({ items: [], total: 0 });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Петров" } });
    expect(await screen.findByText("Заявки не найдены")).toBeVisible();
    fetchRequestList.mockResolvedValueOnce({ items: [request()], total: 24, hasMore: true, nextCursor: "next" });
    await userEvent.click(screen.getByRole("button", { name: "Очистить поиск заявок" }));
    expect(await screen.findByRole("link")).toBeVisible();
    expect(fetchRequestList).toHaveBeenLastCalledWith({ serviceId: "svc", search: "", limit: 3 });
    expect(screen.getByRole("button", { name: "Ещё" })).toBeVisible();
  });

  it("накапливает новые заявки и сохраняет строки до нажатия, включая возврат во вкладку", async () => {
    fetchRequestList.mockResolvedValue({ items: [request({ id: "old", customerName: "Старая" })] });
    render(<ServiceRequestsPanel serviceId={null} titleFor={(item) => item.customerName!} />);
    await screen.findByRole("link", { name: /Старая/ });
    fetchRequestList.mockResolvedValue({ items: [request({ id: "new", customerName: "Новый заказчик" }), request({ id: "old", customerName: "Старая" })] });
    act(() => {
      for (let i = 0; i < 10000; i++) window.dispatchEvent(new Event("free-request:created"));
    });
    expect(fetchRequestList).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Показать новые" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Новый заказчик/ })).not.toBeInTheDocument();
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(screen.queryByRole("link", { name: /Новый заказчик/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Показать новые" }));
    expect(await screen.findByRole("link", { name: /Новый заказчик/ })).toBeVisible();
    expect(screen.getAllByRole("link")[0]).toHaveTextContent("Новый заказчик");
    expect(screen.queryByRole("button", { name: "Показать новые" })).not.toBeInTheDocument();
  });

  it("при ошибке обновления сохраняет список и позволяет повторить загрузку", async () => {
    fetchRequestList.mockResolvedValueOnce({ items: [request({ customerName: "Старая" })] });
    render(<ServiceRequestsPanel serviceId={null} titleFor={(item) => item.customerName!} />);
    await screen.findByRole("link", { name: /Старая/ });
    act(() => window.dispatchEvent(new Event("free-request:created")));
    fetchRequestList.mockRejectedValueOnce(new Error("Нет соединения"));
    await userEvent.click(screen.getByRole("button", { name: "Показать новые" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Нет соединения");
    expect(screen.getByRole("link", { name: /Старая/ })).toBeVisible();
    fetchRequestList.mockResolvedValueOnce({ items: [request({ customerName: "Новый заказчик" })] });
    await userEvent.click(screen.getByRole("button", { name: "Показать новые" }));
    expect(await screen.findByRole("link", { name: /Новый заказчик/ })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("не теряет уведомление, пришедшее во время загрузки, и блокирует повторный клик", async () => {
    fetchRequestList.mockResolvedValueOnce({ items: [] });
    render(<ServiceRequestsPanel serviceId={null} />);
    await screen.findByText("Пока нет заявок");
    act(() => window.dispatchEvent(new Event("free-request:created")));
    let resolveLoad!: (value: { items: RequestProDto[] }) => void;
    fetchRequestList.mockReturnValueOnce(new Promise((resolve) => { resolveLoad = resolve; }));
    await userEvent.click(screen.getByRole("button", { name: "Показать новые" }));
    expect(screen.getByRole("button", { name: "Обновление…" })).toBeDisabled();
    act(() => window.dispatchEvent(new Event("free-request:created")));
    await act(async () => resolveLoad({ items: [request({ id: "first" })] }));
    expect(screen.getByRole("button", { name: "Показать новые" })).toBeEnabled();
    expect(fetchRequestList).toHaveBeenCalledTimes(2);
    fetchRequestList.mockResolvedValueOnce({ items: [request({ id: "last" }), request({ id: "first" })] });
    await userEvent.click(screen.getByRole("button", { name: "Показать новые" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "Показать новые" })).not.toBeInTheDocument();
  });

  it("не повторяет имя заказчика, если оно уже в заголовке", async () => {
    fetchRequestList.mockResolvedValue({
      items: [request({ customerName: "Иван Иванов" })],
    });

    render(<ServiceRequestsPanel serviceId="svc" titleFor={() => "Иван Иванов"} />);

    const link = await screen.findByRole("link");
    expect(link.textContent?.match(/Иван Иванов/g)).toHaveLength(1);
  });

  it("у свободной заявки имя в заголовке, текст ниже, аватар рядом с именем", async () => {
    fetchRequestList.mockResolvedValue({
      items: [request({ customerName: "Иван Иванов", message: "Нужен электрик" })],
    });

    render(
      <ServiceRequestsPanel
        serviceId={null}
        showCustomerAvatar
        titleFor={(item) => item.customerName?.trim() || "Заявка"}
      />,
    );

    const link = await screen.findByRole("link");
    expect(link).toHaveTextContent("Нужен электрик");
    expect(link.textContent?.match(/Иван Иванов/g)).toHaveLength(1);

    const avatar = screen.getByText("ИИ");
    const name = screen.getByText("Иван Иванов", { selector: "span" });
    const day = screen.getByText("06");
    expect(day.compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(avatar.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(name.parentElement?.contains(avatar)).toBe(false);
  });

  it("по клику на фото показывает превью и не открывает заявку", async () => {
    const user = userEvent.setup();
    fetchRequestList.mockResolvedValue({
      items: [request({ customerName: "Иван Иванов", customerImage: "https://cdn.example/customer.jpg" })],
    });

    render(<ServiceRequestsPanel serviceId="svc" showCustomerAvatar titleFor={() => "Иван Иванов"} />);

    const link = await screen.findByRole("link");
    const opened = vi.fn();
    link.addEventListener("click", opened);

    await user.click(screen.getByRole("img", { name: "Иван Иванов" }));

    expect(opened).not.toHaveBeenCalled();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByRole("tooltip").querySelector("img")).toHaveAttribute("src", "https://cdn.example/customer.jpg");
  });

  it("показывает город, текст заявки и статус слева от счётчика", async () => {
    fetchRequestList.mockResolvedValue({
      items: [
        request({
          customerName: "Иван Иванов",
          message: "Нужно подключить щиток",
          requestCity: { id: "c1", name: "Пермь", regionCode: "59", regionName: "Пермский край" },
        }),
      ],
    });

    render(<ServiceRequestsPanel serviceId="svc" titleFor={() => "Иван Иванов"} />);

    const link = await screen.findByRole("link");
    const text = link.textContent ?? "";
    expect(link).toHaveTextContent("Пермь");
    expect(link).toHaveTextContent("Нужно подключить щиток");
    expect(link).toHaveTextContent("Новая");
    expect(text.indexOf("Нужно подключить щиток")).toBeLessThan(text.indexOf("Новая"));
    expect(text.indexOf("Новая")).toBeLessThan(text.search(/день|дня|дней|час|часа|часов/));
  });

  it("не повторяет текст заявки, если он уже в реплике", async () => {
    fetchRequestList.mockResolvedValue({
      items: [
        request({
          customerName: "Валерия",
          message: "Здравствуйте, у меня есть вопрос по вашей услуге.",
          customerLastMessage: "Здравствуйте, у меня есть вопрос по вашей услуге.",
          requestCity: { id: "c1", name: "Екатеринбург", regionCode: "66", regionName: "Свердловская область" },
        }),
      ],
    });

    render(<ServiceRequestsPanel serviceId="svc" titleFor={() => "Валерия"} />);

    const link = await screen.findByRole("link");
    expect(link).toHaveTextContent("Валерия");
    expect(link).toHaveTextContent("Екатеринбург");
    expect(link).not.toHaveTextContent("Здравствуйте");
    expect(screen.getAllByText("Здравствуйте, у меня есть вопрос по вашей услуге.")).toHaveLength(1);
  });

  it("показывает реплику заказчика", async () => {
    fetchRequestList.mockResolvedValue({
      items: [request({ customerLastMessage: "Когда сможете?" })],
    });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);

    expect(await screen.findByText("Когда сможете?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ответить" })).toBeInTheDocument();
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: "svc", search: "", limit: 3 });
  });

  it("в «Ответить» не показывает свою прошлую реплику", async () => {
    fetchRequestList.mockResolvedValue({
      items: [
        request({
          customerLastMessage: "Заказчик выбрал вас исполнителем",
          providerLastMessage: "привет",
          awaitingCustomerReply: false,
        }),
      ],
    });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);

    expect(await screen.findByText("Заказчик выбрал вас исполнителем")).toBeInTheDocument();
    expect(screen.queryByText("привет")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ответить" })).toBeInTheDocument();
  });

  it("показывает реплику заказчика и после ответа ставит «Ждем ответ»", async () => {
    const user = userEvent.setup();
    fetchRequestList.mockResolvedValue({
      items: [
        request({
          id: "talk",
          status: "DISCUSSING",
          customerName: "Иван Иванов",
          customerLastMessage: "Когда сможете?",
        }),
      ],
    });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);

    expect(await screen.findByText("Когда сможете?")).toBeInTheDocument();
    const link = screen.getByRole("link");
    const reply = screen.getByRole("button", { name: "Ответить" });
    expect(link.contains(reply)).toBe(false);
    expect(link).toHaveTextContent("06");
    expect(link).not.toHaveTextContent("Когда сможете?");

    await user.click(reply);
    await user.type(screen.getByLabelText("Сообщение"), "Завтра");
    await user.click(screen.getByRole("button", { name: "Отправить" }));

    expect(await screen.findByText("Ждем ответ")).toBeInTheDocument();
    expect(screen.queryByText("минута")).not.toBeInTheDocument();
    // Why: диалог ещё закрывается и помечает строку aria-hidden.
    expect(screen.getByRole("img", { name: "Ответ отправлен", hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
    expect(screen.getByText("Когда сможете?")).toBeInTheDocument();
    expect(screen.getByText("Завтра")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Валерия", hidden: true })).toBeInTheDocument();
    expect(replyToRequestCustomer).toHaveBeenCalledWith({ requestId: "talk", body: "Завтра" });
    expect(invalidateRequestListCache).toHaveBeenCalledWith({ serviceId: "svc" });
  });

  it("если исполнитель уже ответил, вместо кнопки показывает «Ждем ответ»", async () => {
    fetchRequestList.mockResolvedValue({
      items: [
        request({
          id: "talk",
          status: "DISCUSSING",
          customerLastMessage: "Когда сможете?",
          providerLastMessage: "Завтра в десять",
          awaitingCustomerReply: true,
          lastMessageAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        }),
      ],
    });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);

    expect(await screen.findByText("Ждем ответ")).toBeInTheDocument();
    expect(screen.getByText("Обсуждение")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Ответ отправлен" })).not.toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("минут")).toBeInTheDocument();
    const question = screen.getByText("Когда сможете?");
    const answer = screen.getByText("Завтра в десять");
    expect(question.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ответить" })).not.toBeInTheDocument();
  });

  it("через 5 секунд после отправки галочка сменяется счётчиком", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T15:00:00.000Z"));
    try {
      render(
        <ServiceRequestRow
          request={request({
            status: "DISCUSSING",
            awaitingCustomerReply: true,
            lastMessageAt: "2026-10-09T15:00:00.000Z",
            customerLastMessage: "Привет",
            providerLastMessage: "Привет",
          })}
          title="Pavel Usov"
          onReply={() => undefined}
        />,
      );

      expect(screen.getByRole("img", { name: "Ответ отправлен" })).toBeInTheDocument();
      expect(screen.queryByText("минута")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(screen.queryByRole("img", { name: "Ответ отправлен" })).not.toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("минута")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ProMyServicesSection", () => {
  beforeEach(() => {
    fetchRequestList.mockReset();
    readRequestListCache.mockReset();
    writeRequestListCache.mockReset();
    invalidateRequestListCache.mockReset();
    readRequestListCache.mockReturnValue(null);
  });

  it("shows only the first service photo", async () => {
    fetchRequestList.mockResolvedValue({ items: [request()] });

    render(
      <ProMyServicesSection
        services={[
          {
            ...mainService,
            image: "/images/legacy.jpg",
            images: ["/images/first.jpg", "/images/second.jpg"],
          },
        ]}
      />,
    );

    const photo = await screen.findByRole("img", {
      name: "Фото услуги «Межевание участка»",
    });
    expect(new URL(photo.getAttribute("src") ?? "", window.location.origin).pathname).toBe("/images/first.jpg");
    expect(screen.getAllByRole("img")).toHaveLength(1);

    fireEvent.error(photo);
    const secondPhoto = screen.getByRole("img", {
      name: "Фото услуги «Межевание участка»",
    });
    expect(new URL(secondPhoto.getAttribute("src") ?? "", window.location.origin).pathname).toBe("/images/second.jpg");

    fireEvent.error(secondPhoto);
    const legacyPhoto = screen.getByRole("img", {
      name: "Фото услуги «Межевание участка»",
    });
    expect(new URL(legacyPhoto.getAttribute("src") ?? "", window.location.origin).pathname).toBe("/images/legacy.jpg");

    fireEvent.error(legacyPhoto);
    expect(screen.getByText("Фото недоступно")).toBeVisible();
  });

  it("puts actionable services first and shows empty services by default", async () => {
    fetchRequestList.mockImplementation(async (query: { serviceId: string | null }) => ({ items: query.serviceId === "busy" ? [request({ id: "urgent", customerName: "Ждёт ответа", awaitingCustomerReply: false })] : [] }));
    render(<ProMyServicesSection services={[{ ...mainService, id: "empty", title: "Пустая услуга" }, { ...mainService, id: "busy", title: "Рабочая услуга" }]} />);
    expect(await screen.findByRole("link", { name: /Ждёт ответа/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Пустая услуга" })).toBeVisible();
    const headings = screen.getAllByRole("heading").map(node => node.textContent);
    expect(headings.indexOf("Рабочая услуга")).toBeLessThan(headings.indexOf("Пустая услуга"));
    await userEvent.click(await screen.findByRole("button", { name: "Скрыть услуги без заявок" }));
    expect(screen.queryByRole("heading", { name: "Пустая услуга" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Услуги без заявок (1)" }));
    expect(screen.getByRole("heading", { name: "Пустая услуга" })).toBeVisible();
  });

  it("дозагружает услуги независимо друг от друга", async () => {
    fetchRequestList.mockImplementation(async (query: { serviceId: string; cursor?: string }) => ({
      items: Array.from({ length: query.cursor ? 2 : 3 }, (_, index) => request({ id: `${query.serviceId}-${query.cursor ?? "first"}-${index}`, customerName: `${query.serviceId} клиент ${query.cursor ? index + 3 : index}` })),
      total: 5, hasMore: !query.cursor, nextCursor: query.cursor ? null : "next",
    }));
    render(<ProMyServicesSection services={[{ ...mainService, id: "a", title: "Услуга А" }, { ...legalService, id: "b", title: "Услуга Б", status: "PUBLISHED" }]} />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Ещё" })).toHaveLength(2));
    const buttons = screen.getAllByRole("button", { name: "Ещё" });
    await userEvent.click(buttons[0]);
    expect(await screen.findByRole("link", { name: /a клиент 4/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /b клиент 4/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ещё" }));
    expect(await screen.findByRole("link", { name: /b клиент 4/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /a клиент 4/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ещё" })).not.toBeInTheDocument();
  });
});

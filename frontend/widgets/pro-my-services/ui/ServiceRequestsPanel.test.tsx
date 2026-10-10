import { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { legalService, mainService } from "@/tests/fixtures/services";
import { ProMyServicesSection } from "./ProMyServicesSection";
import { ServiceRequestRow } from "./ServiceRequestRow";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";

const { fetchRequestList, readRequestListCache, writeRequestListCache, replyToRequestCustomer } = vi.hoisted(() => ({
  fetchRequestList: vi.fn(),
  readRequestListCache: vi.fn((): RequestProDto[] | null => null),
  writeRequestListCache: vi.fn(),
  replyToRequestCustomer: vi.fn(),
}));

vi.mock("../lib/fetch-request-list", () => ({
  fetchRequestList,
}));

vi.mock("../lib/reply-to-customer", () => ({
  replyToRequestCustomer,
}));

vi.mock("../lib/request-list-cache", () => ({
  readRequestListCache,
  writeRequestListCache,
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
    paidAmountRubles: 0,
    remainingAmountRubles: null,
    payments: [],
    cadastralNumbers: [],
    createdAt: "2026-10-06T10:00:00.000Z",
    updatedAt: "2026-10-06T10:00:00.000Z",
    ...overrides,
  };
}

describe("ServiceRequestsPanel", () => {
  beforeEach(() => {
    fetchRequestList.mockReset();
    readRequestListCache.mockReset();
    writeRequestListCache.mockReset();
    replyToRequestCustomer.mockReset();
    readRequestListCache.mockReturnValue(null);
    replyToRequestCustomer.mockResolvedValue(undefined);
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
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: "svc" });
  });

  it("длиннее трёх сворачивает список и раскрывает иконкой в шапке", async () => {
    const user = userEvent.setup();
    fetchRequestList.mockResolvedValue({
      items: Array.from({ length: 6 }, (_, index) =>
        request({ id: `r${index}`, customerName: `Клиент ${index}` }),
      ),
    });

    render(<ServiceRequestsPanel serviceId="svc" titleFor={(item) => item.customerName ?? "Заявка"} />);

    expect(await screen.findAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*6/);
    expect(screen.queryByRole("link", { name: /Клиент 5/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Развернуть заявки" }));

    expect(await screen.findByRole("link", { name: /Клиент 5/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: "Свернуть заявки" }));

    await waitFor(() => expect(screen.queryByRole("link", { name: /Клиент 5/ })).not.toBeInTheDocument());
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("при пустом ответе показывает пустое состояние и ноль", async () => {
    fetchRequestList.mockResolvedValue({ items: [] });

    render(<ServiceRequestsPanel serviceId={null} emptyLabel="Пока нет свободных заявок" />);

    expect(await screen.findByText("Пока нет свободных заявок")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Фильтр заявок" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*0/);
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: null });
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
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: "svc" });
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
    expect(writeRequestListCache).toHaveBeenCalledWith({ serviceId: "svc" }, [
      expect.objectContaining({
        id: "talk",
        awaitingCustomerReply: true,
        customerLastMessage: "Когда сможете?",
        providerLastMessage: "Завтра",
        lastMessageAt: expect.any(String),
      }),
    ]);
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
    readRequestListCache.mockReturnValue(null);
  });

  it("разворачивает только один список заявок", async () => {
    const user = userEvent.setup();
    fetchRequestList.mockImplementation(async (query: { serviceId: string | null }) => ({
      items: Array.from({ length: 5 }, (_, index) =>
        request({
          id: `${query.serviceId}-${index}`,
          serviceId: query.serviceId ?? undefined,
          customerName: `${query.serviceId} клиент ${index}`,
        }),
      ),
    }));

    render(
      <ProMyServicesSection
        services={[
          { ...mainService, id: "a", title: "Услуга А" },
          { ...legalService, id: "b", title: "Услуга Б", status: "PUBLISHED" },
        ]}
      />,
    );

    const expandButtons = await screen.findAllByRole("button", { name: "Развернуть заявки" });
    expect(expandButtons).toHaveLength(2);

    await user.click(expandButtons[0]);
    expect(await screen.findByRole("link", { name: /a клиент 4/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /b клиент 4/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Развернуть заявки" }));
    expect(await screen.findByRole("link", { name: /b клиент 4/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("link", { name: /a клиент 4/ })).not.toBeInTheDocument());
  });
});

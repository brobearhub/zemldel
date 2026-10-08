import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestProDto, RequestStatus, RequestSubjectType } from "@/entities/request";
import { ServiceRequestsPanel } from "./ServiceRequestsPanel";

const { fetchRequestList, readRequestListCache, readCachedStageCounts } = vi.hoisted(() => ({
  fetchRequestList: vi.fn(),
  readRequestListCache: vi.fn((): RequestProDto[] | null => null),
  readCachedStageCounts: vi.fn((): Record<string, number> | null => null),
}));

vi.mock("../lib/fetch-request-list", () => ({
  fetchRequestList,
}));

vi.mock("../lib/request-list-cache", () => ({
  readRequestListCache,
  readCachedStageCounts,
  emptyRequestListStageCounts: () => ({
    NEW: 0,
    DISCUSSING: 0,
    CONTRACT: 0,
    WORK: 0,
    ACCEPTANCE: 0,
    COMPLETED: 0,
  }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const LOCKED_AT = "2026-10-01T00:00:00.000Z";

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
    readCachedStageCounts.mockReset();
    readRequestListCache.mockReturnValue(null);
    readCachedStageCounts.mockReturnValue(null);
  });

  const counts = { NEW: 1, DISCUSSING: 0, CONTRACT: 2, WORK: 0, ACCEPTANCE: 0, COMPLETED: 3 };

  it("по умолчанию запрашивает «Новые» и сразу показывает счётчики остальных шагов", async () => {
    fetchRequestList.mockResolvedValue({ items: [request({ id: "new" })], counts });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);

    expect(await screen.findByRole("button", { name: "Новые 1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Договор 2" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Завершена 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обсуждение" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /Все/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*3/);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: "svc", stage: "NEW" });
  });

  it("переключает шаг и не сбрасывает его повторным кликом", async () => {
    const user = userEvent.setup();
    fetchRequestList.mockImplementation(async (query: { stage: string }) => {
      if (query.stage === "NEW") return { items: [request({ id: "new" })], counts };
      if (query.stage === "CONTRACT") {
        return {
          items: [request({ id: "deal", status: "DISCUSSING", lockedAt: LOCKED_AT })],
          counts,
        };
      }
      return { items: [], counts };
    });

    render(<ServiceRequestsPanel serviceId="svc" serviceTitle="Подключение" />);
    await screen.findByRole("button", { name: "Новые 1" });

    await user.click(screen.getByRole("button", { name: "Договор 2" }));
    expect(await screen.findByRole("link")).toHaveAttribute("href", "/pro/requests/deal");
    expect(screen.getByRole("button", { name: "Договор 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*3/);
    expect(screen.queryByRole("button", { name: /Все/ })).not.toBeInTheDocument();

    const calls = fetchRequestList.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Договор 2" }));
    expect(fetchRequestList).toHaveBeenCalledTimes(calls);
    expect(screen.getAllByRole("link")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "В работе" }));
    expect(await screen.findByText("Пока нет заявок")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "В работе" })).toHaveAttribute("aria-pressed", "true");
  });

  it("при пустом ответе оставляет «Новые» выбранными", async () => {
    fetchRequestList.mockResolvedValue({
      items: [],
      counts: { NEW: 0, DISCUSSING: 0, CONTRACT: 0, WORK: 0, ACCEPTANCE: 0, COMPLETED: 0 },
    });

    render(<ServiceRequestsPanel serviceId={null} emptyLabel="Пока нет свободных заявок" />);

    expect(await screen.findByText("Пока нет свободных заявок")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новые" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /Все/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Заявки" }).parentElement).toHaveTextContent(/Заявки\s*0/);
    expect(fetchRequestList).toHaveBeenCalledWith({ serviceId: null, stage: "NEW" });
  });

  it("не повторяет имя заказчика, если оно уже в заголовке", async () => {
    fetchRequestList.mockResolvedValue({
      items: [request({ customerName: "Иван Иванов" })],
      counts,
    });

    render(<ServiceRequestsPanel serviceId="svc" titleFor={() => "Иван Иванов"} />);

    const link = await screen.findByRole("link");
    expect(link.textContent?.match(/Иван Иванов/g)).toHaveLength(1);
  });

  it("у свободной заявки имя в заголовке, текст ниже, аватар рядом с именем", async () => {
    fetchRequestList.mockResolvedValue({
      items: [request({ customerName: "Иван Иванов", message: "Нужен электрик" })],
      counts,
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
      counts,
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

  it("показывает город и текст заявки и не показывает статус строки", async () => {
    fetchRequestList.mockResolvedValue({
      items: [
        request({
          customerName: "Иван Иванов",
          message: "Нужно подключить щиток",
          requestCity: { id: "c1", name: "Пермь", regionCode: "59", regionName: "Пермский край" },
        }),
      ],
      counts,
    });

    render(<ServiceRequestsPanel serviceId="svc" titleFor={() => "Иван Иванов"} />);

    const link = await screen.findByRole("link");
    const text = link.textContent ?? "";
    expect(link).toHaveTextContent("Пермь");
    expect(link).toHaveTextContent("Нужно подключить щиток");
    expect(link).not.toHaveTextContent("Новая");
    expect(text.indexOf("Нужно подключить щиток")).toBeLessThan(text.search(/день|дня|дней|час|часа|часов/));
  });
});

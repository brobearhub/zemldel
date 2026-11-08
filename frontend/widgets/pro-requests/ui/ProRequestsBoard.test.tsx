import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestProDto } from "@/entities/request";
import { ProRequestsFeed } from "./ProRequestsFeed";

const viewport = vi.hoisted(() => ({ desktop: true }));

vi.mock("@mui/material", async (importOriginal) => ({
  ...await importOriginal<typeof import("@mui/material")>(),
  useMediaQuery: () => viewport.desktop,
}));

vi.mock("@/widgets/pro-requests/model/useProRequestsFeed", () => ({
  useProRequestsFeed: () => ({
    eligibleCategories: [{ id: "survey", name: "Кадастровые работы", slug: "survey" }],
    error: null,
    refresh: vi.fn(),
    itemsByStatus: { NEW: [], DISCUSSING: [] },
    archiveItems: [],
  }),
}));

function request(overrides: Partial<RequestProDto> = {}): RequestProDto {
  return {
    id: "new-request",
    status: "NEW",
    subjectType: "SERVICE",
    serviceId: "service-1",
    serviceTitle: "Межевой план",
    categoryId: "survey",
    categoryName: "Кадастровые работы",
    message: "Нужно уточнить границы участка",
    customerName: "Анна Иванова",
    customerImage: null,
    customerRating: null,
    totalAmountRubles: null,
    servicePriceRubles: 12000,
    priceProposal: null,
    isLocked: false,
    awaitingCustomerReply: false,
    createdAt: "2026-11-03T07:45:00.000Z",
    ...overrides,
  } as RequestProDto;
}

beforeEach(() => {
  viewport.desktop = true;
});

describe("Доска заявок", () => {
  it("открывает три рабочие колонки и позволяет показать завершённые заявки", () => {
    render(<ProRequestsFeed initialItems={[]} initialOrders={[
      request(),
      request({ id: "done-request", status: "COMPLETED", serviceTitle: "Готовый план" }),
    ]} />);
    expect(screen.getByRole("heading", { name: "Доска заявок" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Новая", "Обсуждение", "В работе",
    ]);
    expect(screen.queryByRole("link", { name: "Готовый план" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Заявка выполнена 1" }));
    expect(screen.getByRole("link", { name: "Готовый план" })).toHaveAttribute("href", "/pro/requests/done-request");
  });

  it("фильтрует заявки по категории и сбрасывает выбор через Все", () => {
    render(<ProRequestsFeed initialItems={[]} initialOrders={[
      request(),
      request({ id: "free", subjectType: "FREEFORM", categoryId: null, serviceId: null }),
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Без категории" }));
    expect(screen.queryByRole("link", { name: "Межевой план" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новая 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Все" }));
    expect(screen.getByRole("link", { name: "Межевой план" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новая 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Кадастровые работы" }));
    expect(screen.queryByRole("link", { name: "Свободная заявка" })).not.toBeInTheDocument();
  });

  it("на мобильном открывает выбранный статус, включая скрытые на десктопе", () => {
    viewport.desktop = false;
    render(<ProRequestsFeed initialItems={[]} initialOrders={[
      request(),
      request({ id: "done-request", status: "COMPLETED", serviceTitle: "Готовый план" }),
    ]} />);
    expect(screen.queryByRole("region", { name: "Доска заявок по статусам" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Заявка выполнена 1" }));
    expect(screen.getByRole("link", { name: "Готовый план" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Межевой план" })).not.toBeInTheDocument();
  });

  it("не выдаёт справочную цену за согласованную и не предлагает ответить на заблокированную заявку", () => {
    render(<ProRequestsFeed initialItems={[]} initialOrders={[
      request({ isLocked: true }),
    ]} />);
    expect(screen.getByText("Цена не согласована")).toBeInTheDocument();
    expect(screen.queryByText(/Согласовано:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ответить" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Услуга" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть заявку" })).toHaveAttribute("href", "/pro/requests/new-request");
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterestPage } from "./InterestPage";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({ auth: { user: { activeProviderId: "provider" } } }),
}));
const interest = {
  providerId: "provider",
  profileCount: 1,
  interestedCount: 1,
  canContact: true,
  services: [],
  items: [{ customerId: "customer", name: "Анна П.", profile: true, services: [], conversationId: null, state: "NONE" }],
  hasMore: false,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => push.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("provider interest", () => {
  it("shows each favorite service once when the list is opened and closed", async () => {
    const services = [
      { id: "one", title: "Кадастровые работы", available: true },
      { id: "two", title: "Разрешение на строительство", available: true },
      { id: "three", title: "Изменение вида использования", available: true },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({
      ...interest,
      items: [{ ...interest.items[0], services }],
    })));
    render(<InterestPage />);

    const summary = await screen.findByText("Кадастровые работы");
    const details = summary.closest("details");
    const count = within(summary).getByText("и ещё 2");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(count).toBeVisible();
    expect(within(details!).getAllByText(/Кадастровые работы/)).toHaveLength(1);
    expect(within(details!).getByText("Разрешение на строительство")).not.toBeVisible();
    expect(within(details!).getByText("Изменение вида использования")).not.toBeVisible();

    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(count).not.toBeVisible();
    expect(within(details!).getAllByText(/Кадастровые работы/)).toHaveLength(1);
    expect(within(details!).getByText("Разрешение на строительство")).toBeVisible();
    expect(within(details!).getByText("Изменение вида использования")).toBeVisible();

    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
    expect(count).toBeVisible();
    expect(within(details!).getAllByText(/Кадастровые работы/)).toHaveLength(1);
    expect(within(details!).getByText("Разрешение на строительство")).not.toBeVisible();
    expect(within(details!).getByText("Изменение вида использования")).not.toBeVisible();
  });

  it("shows a single favorite service without an expansion control", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({
      ...interest,
      items: [{
        ...interest.items[0],
        services: [{ id: "one", title: "Кадастровые работы", available: true }],
      }],
    })));
    render(<InterestPage />);

    const title = await screen.findByText("Кадастровые работы");
    expect(title).toBeVisible();
    expect(screen.getAllByText("Кадастровые работы")).toHaveLength(1);
    expect(title.closest("details")).toBeNull();
    expect(screen.queryByText(/и ещё/)).not.toBeInTheDocument();
  });

  it.each([1, 2])("marks the first unavailable service with %i favorite services", async (count) => {
    const services = [
      { id: "one", title: "Кадастровые работы", available: false },
      { id: "two", title: "Разрешение на строительство", available: true },
    ].slice(0, count);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({
      ...interest,
      items: [{ ...interest.items[0], services }],
    })));
    render(<InterestPage />);

    const title = await screen.findByText(/Кадастровые работы.*недоступна/);
    expect(title).toBeVisible();
    expect(screen.getAllByText(/Кадастровые работы/)).toHaveLength(1);
    if (count === 1) {
      expect(title.closest("details")).toBeNull();
    } else {
      expect(title).toHaveTextContent("и ещё 1");
      const countLabel = within(title).getByText("и ещё 1");
      expect(countLabel).toBeVisible();
      fireEvent.click(title);
      expect(countLabel).not.toBeVisible();
      expect(screen.getAllByText(/Кадастровые работы/)).toHaveLength(1);
      expect(screen.getByText("Разрешение на строительство")).toBeVisible();
    }
  });

  it("keeps counters and the tariff link visible without exposing customers on other plans", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ...interest, canContact: false, items: [] })));
    render(<InterestPage />);
    expect(await screen.findByText("Имена клиентов и первое обращение доступны на тарифе Бизнес.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Тарифы" })).toHaveAttribute("href", "/pro/settings/tariff");
    expect(screen.getByText("Вас добавили в избранное")).toBeVisible();
    expect(screen.queryByText("Анна П.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Написать" })).toBeNull();
  });

  it("keeps a failed first message and reuses its operation ID before opening the created chat", async () => {
    const sent: Record<string, string>[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, init) => {
      if (init?.method !== "POST") return Promise.resolve(json(interest));
      sent.push(JSON.parse(init.body));
      return Promise.resolve(sent.length === 1 ? json({ message: "Не удалось отправить" }, 503) : json({ conversationId: "dialog" }));
    }));
    render(<InterestPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Написать" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Сообщение" }), { target: { value: "Могу помочь с участком" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    expect(await screen.findByText("Не удалось отправить")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Сообщение" })).toHaveValue("Могу помочь с участком");
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pro/chats/direct/dialog"));
    expect(sent[1]).toEqual(sent[0]);
    expect(sent[0]).toMatchObject({ customerId: "customer", body: "Могу помочь с участком", clientMessageId: expect.any(String) });
  });
});

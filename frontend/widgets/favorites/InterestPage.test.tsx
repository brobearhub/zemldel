import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

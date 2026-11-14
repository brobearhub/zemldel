import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ColorModeProvider,
  COLOR_MODE_STORAGE_KEY,
} from "@/core/theme/ColorModeContext";
import { ProSidebar } from "./ProSidebar";

const chatState = vi.hoisted(() => ({
  unreadByRequestId: {} as Record<string, number>,
  pathname: "/pro/requests/feed",
  role: "OWNER",
}));
vi.mock("next/navigation", () => ({ usePathname: () => chatState.pathname }));
vi.mock("@/core/store/hooks", () => ({ useAppSelector: (selector: (state: unknown) => unknown) => selector({ auth: { user: { activeProviderId: "p", memberships: [{ providerId: "p", providerName: "Компания", role: chatState.role }] } } }) }));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => chatState,
}));
vi.mock("@mui/material", async (original) => ({
  ...(await original<typeof import("@mui/material")>()),
  useMediaQuery: () => true,
}));

beforeEach(() => {
  localStorage.clear();
  chatState.unreadByRequestId = {};
  chatState.pathname = "/pro/requests/feed";
  chatState.role = "OWNER";
});
const setup = (collapsed = false) =>
  render(
    <ColorModeProvider>
      <ProSidebar providerName="Компания" collapsed={collapsed} />
    </ColorModeProvider>,
  );

describe("Меню исполнителя", () => {
  it("обновляет счётчик чатов в свёрнутом меню", () => {
    chatState.pathname = "/pro/chats/request-1";
    chatState.unreadByRequestId = { first: 2, second: 3 };
    const view = setup(true);
    const chat = screen.getByRole("link", {
      name: "Чаты, непрочитанных сообщений: 5",
    });
    expect(chat).toHaveAttribute("href", "/pro/chats");
    expect(chat).toHaveAttribute("aria-current", "page");
    expect(within(chat).getByText("5")).toHaveClass("MuiBadge-badge");
    expect(
      within(screen.getByRole("button", { name: "Заявки" })).queryByText("5"),
    ).toBeNull();
    chatState.unreadByRequestId = {};
    view.rerender(
      <ColorModeProvider>
        <ProSidebar
          providerName="Компания"
          collapsed
        />
      </ColorModeProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Чаты" }).querySelector(".MuiBadge-badge"),
    ).toHaveClass("MuiBadge-invisible");
  });

  it("показывает основные разделы и вложенные настройки, сохраняет выбранную тему", () => {
    setup();
    const menu = screen.getByRole("navigation", { name: "Меню исполнителя" });
    expect(
      within(menu)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Чаты", "Лента заявок", "Доска", "Услуги", "Интерес клиентов", "Клиенты", "Сторисы", "Обзор"]);
    const team = within(menu).getByRole("button", { name: "Команда" });
    expect(team).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(team);
    expect(
      within(menu).getByRole("link", { name: "Команда" }),
    ).toHaveAttribute("href", "/pro/team/add-manager");
    expect(
      within(menu).getByRole("link", { name: "Задачи команды" }),
    ).toHaveAttribute("href", "/pro/team/tasks");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Настройки" }));
    const settings = screen.getByRole("region", { name: "Настройки" });
    expect(menu).toContainElement(settings);
    expect(
      screen.queryByRole("link", { name: "Лента заявок" }),
    ).not.toBeInTheDocument();
    expect(
      within(settings).queryByRole("button", { name: "Команда" }),
    ).not.toBeInTheDocument();
    const templates = within(settings).getByRole("button", { name: "Шаблоны" });
    expect(templates).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(templates);
    expect(
      within(settings)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/pro/settings/profile",
      "/pro/settings/account",
      "/pro/settings/promotion",
      "/pro/settings/templates/replies",
      "/pro/settings/templates/stage-statuses",
      "/pro/settings/messengers",
      "/pro/settings/tariff",
    ]);
    const theme = within(settings).getByRole("switch", { name: "Тема" });
    expect(within(settings).getByRole("button", { name: "Выйти" })).toBeInTheDocument();
    fireEvent.click(theme);
    expect(theme).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");
    fireEvent.click(theme);
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("light");
  });

  it("открывает настройки в свёрнутом меню и закрывает панель клавишей Escape", async () => {
    setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Настройки" }));
    fireEvent.keyDown(screen.getByRole("region", { name: "Настройки" }), {
      key: "Escape",
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Настройки" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Настройки" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

it("показывает сотруднику только назначенные заявки и личные настройки", () => {
  chatState.role = "EMPLOYEE";
  setup();
  expect(screen.getByRole("link", { name: "Назначенные заявки" })).toHaveAttribute("href", "/pro/assigned");
  expect(screen.queryByRole("link", { name: "Услуги" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Настройки" }));
  expect(screen.getByRole("link", { name: "Мои данные" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Тариф" })).not.toBeInTheDocument();
});

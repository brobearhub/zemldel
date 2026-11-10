import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { ColorModeProvider } from "@/core/theme/ColorModeContext";
import { makeStore } from "@/core/store/store";
import { setAuthenticated, setUnauthenticated } from "@/core/store/authSlice";
import {
  NAV_ITEMS,
  REQUEST_ITEMS,
} from "@/widgets/pro-dashboard/model/navigation";
import { CabinetDesktopSidebar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopSidebar";
import { MobileMenuButton, MobileNavigation } from "./MobileNavigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pro/requests/feed",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@mui/material/useMediaQuery", () => ({ default: () => true }));
vi.mock("@/widgets/header/ui/HeaderCity", () => ({
  HeaderCity: () => <span>Екатеринбург</span>,
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
const socketState = vi.hoisted(() => ({
  unreadByRequestId: {} as Record<string, number>,
}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => socketState,
}));

// jsdom has no document navigation; keep the real click handler and assert hrefs separately.
beforeEach(() => {
  localStorage.clear();
  socketState.unreadByRequestId = {};
  document.addEventListener("click", preventNavigation);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  document.removeEventListener("click", preventNavigation);
  vi.restoreAllMocks();
});
function preventNavigation(event: MouseEvent) {
  if ((event.target as HTMLElement)?.closest("a")) event.preventDefault();
}

function setup(
  kind: "PROVIDER" | "CUSTOMER" | "guest" = "PROVIDER",
  desktop = false,
) {
  const store = makeStore();
  if (kind === "guest") store.dispatch(setUnauthenticated());
  else
    store.dispatch(
      setAuthenticated({
        id: "u1",
        name: "Иван Иванов",
        email: "user@example.com",
        phone: null,
        image: null,
        accountKind: kind,
        systemRole: "CUSTOMER",
        activeProviderId: "p1",
        customerCity: null,
        memberships:
          kind === "PROVIDER"
            ? [
                {
                  providerId: "p1",
                  providerName: "Компания",
                  providerSlug: "company",
                  providerType: "COMPANY",
                  role: "OWNER",
                  status: "ACTIVE",
                  providerCity: null,
                },
              ]
            : [],
      }),
    );
  render(
    <Provider store={store}>
      <ColorModeProvider>
        <ThemeProvider theme={createAppTheme("light")}>
          {desktop ? (
            <CabinetDesktopSidebar />
          ) : (
            <MobileNavigation>
              <MobileMenuButton />
              <main>Содержимое страницы</main>
            </MobileNavigation>
          )}
        </ThemeProvider>
      </ColorModeProvider>
    </Provider>,
  );
  return userEvent.setup();
}

describe("Единое мобильное меню", () => {
  it("показывает общий счётчик непрочитанных в чатах", async () => {
    socketState.unreadByRequestId = { first: 2, second: 1 };
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    const chat = screen.getByRole("link", {
      name: "Чаты, непрочитанных сообщений: 3",
    });
    expect(chat).toHaveAttribute("href", "/pro/chats");
    expect(within(chat).getByText("3")).toHaveClass("MuiBadge-colorError");
  });

  it("открывает подтверждение профиля из настроек", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(
      screen.queryByRole("img", { name: /Исполнитель.*подтверждён/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Подтверждение профиля" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Настройки" }));
    const link = screen.getByRole("link", { name: "Подтверждение профиля" });
    expect(link).toHaveAttribute("href", "/pro/settings/profile/verification");
    await user.click(link);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("содержит все рабочие разделы сайдбара и закрывается даже при выборе текущего раздела", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    const menu = screen.getByRole("dialog", { name: "Компания" });
    for (const item of [...REQUEST_ITEMS, ...NAV_ITEMS]) {
      expect(
        within(menu).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", item.href);
    }
    expect(
      within(within(menu).getByRole("list", { name: "Работа" })).getByRole(
        "link",
        { name: "Задачи команды" },
      ),
    ).toHaveAttribute("href", "/pro/team/tasks");
    expect(
      within(menu).queryByRole("link", { name: "Добавление менеджера" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("link", { name: "Добавить услугу" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("list", { name: "Команда" }),
    ).not.toBeInTheDocument();
    expect(within(menu).queryByText("Контактное лицо")).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("link", { name: "Мой профиль" }),
    ).not.toBeInTheDocument();
    await user.click(within(menu).getByRole("link", { name: "Лента" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("открывает настройки аватаром и ведёт к данным внутри кабинета", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    await user.click(screen.getByRole("button", { name: "Настройки" }));
    const settings = screen.getByRole("dialog", { name: "Настройки" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      within(settings).getByRole("region", { name: "Настройки" }),
    ).toBeInTheDocument();
    expect(
      within(settings).getByRole("link", { name: "Профиль исполнителя" }),
    ).toHaveAttribute("href", "/pro/settings/profile");
    expect(
      within(settings).getByRole("link", { name: "Добавить услугу" }),
    ).toHaveAttribute("href", "/pro/services/create");
    expect(
      within(settings).getByRole("link", { name: "Добавление менеджера" }),
    ).toHaveAttribute("href", "/pro/team/add-manager");
    expect(
      within(settings).getByRole("link", { name: "Мои данные" }),
    ).toHaveAttribute("href", "/pro/settings/account");
    expect(
      within(settings).getByRole("link", { name: "Статусы этапов" }),
    ).toHaveAttribute("href", "/pro/settings/templates/stage-statuses");
    expect(
      within(settings).getByRole("button", { name: "Выйти" }),
    ).toBeInTheDocument();
    await user.click(
      within(settings).getByRole("link", { name: "Мои данные" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("закрывает настройки и меню по очереди и возвращает фокус", async () => {
    const user = setup();
    const trigger = screen.getByRole("button", { name: "Открыть меню" });
    await user.click(trigger);
    const avatar = screen.getByRole("button", { name: "Настройки" });
    await user.click(avatar);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Настройки" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("dialog", { name: "Компания" }),
    ).toBeInTheDocument();
    expect(avatar).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("сохраняет клиентские ссылки для заказчика", async () => {
    const user = setup("CUSTOMER");
    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(screen.getByRole("link", { name: "Заявки" })).toHaveAttribute(
      "href",
      "/profile?section=requests",
    );
    expect(screen.getByRole("link", { name: "Чаты" })).toHaveAttribute(
      "href",
      "/profile/chats",
    );
    expect(
      screen.queryByRole("link", { name: "Лента" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Свернуть меню" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Профиль" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Мои заявки" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Настройки: Иван Иванов" }),
    );
    const settings = screen.getByRole("dialog", { name: "Настройки" });
    expect(
      within(settings).getByRole("link", { name: "Мои данные" }),
    ).toHaveAttribute("href", "/profile?section=profile");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      within(settings).getByRole("region", { name: "Настройки" }),
    ).toBeInTheDocument();
    expect(
      within(settings).queryByRole("link", { name: "Профиль исполнителя" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(settings).getByRole("button", { name: "Назад в меню" }),
    );
    expect(screen.getByRole("link", { name: "Заявки" })).toBeInTheDocument();
  });

  it("даёт гостю вход и регистрацию без разделов исполнителя", async () => {
    const user = setup("guest");
    await user.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(
      screen.getByRole("link", { name: "Войти как исполнитель" }),
    ).toHaveAttribute("href", "/signin?returnTo=%2Fpro%2Frequests%2Ffeed");
    expect(screen.getByRole("link", { name: "Регистрация" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(
      screen.queryByRole("link", { name: "Мой профиль" }),
    ).not.toBeInTheDocument();
  });
});

describe("Общий десктопный сайдбар", () => {
  it("открывает настройки организации, а задачи команды оставляет в работе", async () => {
    const user = setup("PROVIDER", true);
    const sidebar = screen.getByRole("complementary");
    expect(
      within(sidebar).getByRole("link", { name: "Задачи команды" }),
    ).toHaveAttribute("href", "/pro/team/tasks");
    expect(
      within(sidebar).queryByRole("link", { name: "Добавление менеджера" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(sidebar).getByRole("button", { name: "Настройки: Компания" }),
    );
    const settings = within(screen.getByRole("complementary")).getByRole(
      "region",
      { name: "Настройки" },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole("link", { name: "Доска" }),
    ).not.toBeInTheDocument();
    expect(
      within(settings).getByRole("link", { name: "Добавить услугу" }),
    ).toBeInTheDocument();
    await user.click(
      within(settings).getByRole("link", { name: "Добавление менеджера" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Настройки" }),
      ).not.toBeInTheDocument(),
    );
  });
  it("сворачивается с доступными ссылками и сохраняет выбор", async () => {
    const user = setup("PROVIDER", true);
    await user.click(screen.getByRole("button", { name: "Свернуть меню" }));
    expect(localStorage.getItem("ui.sidebar.pro.collapsed")).toBe("1");
    expect(screen.getByRole("link", { name: "Чаты" })).toHaveAttribute(
      "href",
      "/pro/chats",
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--cabinet-sidebar-width",
      ),
    ).toBe("80px");
    await user.click(screen.getByRole("button", { name: "Настройки" }));
    expect(
      within(screen.getByRole("complementary")).getByRole("region", {
        name: "Настройки",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Назад в меню" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Настройки" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Развернуть меню" }));
    expect(localStorage.getItem("ui.sidebar.pro.collapsed")).toBe("0");
  });
  it("использует клиентские ссылки и настройки для клиента", async () => {
    const user = setup("CUSTOMER", true);
    expect(screen.getByRole("link", { name: "Чаты" })).toHaveAttribute(
      "href",
      "/profile/chats",
    );
    expect(screen.getByRole("link", { name: "Заявки" })).toHaveAttribute(
      "href",
      "/profile?section=requests",
    );
    expect(
      screen.queryByRole("link", { name: "Клиенты" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Настройки: Иван Иванов" }),
    );
    const sidebar = screen.getByRole("complementary", {
      name: "Разделы кабинета клиента",
    });
    const settings = within(sidebar).getByRole("region", { name: "Настройки" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      within(settings).getByRole("link", { name: "Мои данные" }),
    ).toHaveAttribute("href", "/profile?section=profile");
    expect(
      within(settings).queryByRole("link", { name: "Тариф" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(sidebar).getByRole("button", { name: "Назад в меню" }),
    );
    expect(
      within(sidebar).getByRole("link", { name: "Заявки" }),
    ).toBeInTheDocument();
  });
});

describe("Закреплённая панель профиля", () => {
  it.each(["PROVIDER", "CUSTOMER"] as const)(
    "%s сохраняет аватар и показывает название настроек со стрелкой внизу",
    async (kind) => {
      const user = setup(kind, true);
      const avatar = screen.getByRole("button", { name: "Настройки" });
      await user.click(avatar);
      const footer = screen.getByRole("group", { name: "Панель настроек" });
      expect(
        within(footer)
          .getAllByRole("button")
          .map((button) => button.getAttribute("aria-label")),
      ).toEqual(["Аватар профиля", "Настройки", "Назад в меню"]);
      expect(
        within(footer).getByRole("button", { name: "Аватар профиля" }),
      ).toBe(avatar);
      expect(
        within(footer).getByRole("heading", { name: "Настройки" }),
      ).toBeInTheDocument();
      const settings = screen.getByRole("region", { name: "Настройки" });
      expect(
        within(settings).queryByRole("heading", { name: "Настройки" }),
      ).not.toBeInTheDocument();
      expect(
        within(settings).getByRole("link", { name: "Мои данные" }),
      ).toBeInTheDocument();
      expect(
        within(footer).queryByRole("link", { name: "Мои данные" }),
      ).not.toBeInTheDocument();
      await user.click(
        within(footer).getByRole("button", { name: "Назад в меню" }),
      );
      expect(
        screen.queryByRole("region", { name: "Настройки" }),
      ).not.toBeInTheDocument();
      expect(avatar).toHaveFocus();
    },
  );
});

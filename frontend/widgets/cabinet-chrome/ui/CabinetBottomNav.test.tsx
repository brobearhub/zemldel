import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorModeProvider } from "@/core/theme/ColorModeContext";
import { PROVIDER_NAV } from "@/widgets/cabinet-chrome/model/nav-config";
import { CabinetBottomNav } from "./CabinetBottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pro/requests/feed",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/core/store/hooks", () => ({ useAppSelector: () => "Компания" }));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => ({ unreadByRequestId: {} }),
}));

describe("Мобильное меню исполнителя", () => {
  it("показывает группы сайдбара и закрывается при переходе", async () => {
    render(
      <ColorModeProvider>
        <CabinetBottomNav
          items={PROVIDER_NAV.mobileBottom}
          moreItems={PROVIDER_NAV.mobileMore}
          providerMenu
        />
      </ColorModeProvider>,
    );

    expect(screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Главная", "/"],
      ["Заявки", "/pro/requests/feed"],
      ["Услуги", "/pro/services"],
      ["Чаты", "/pro/chats"],
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Меню" }));
    const menu = screen.getByRole("navigation", { name: "Меню исполнителя" });
    expect(within(menu).getByRole("button", { name: "Заявки" })).toHaveAttribute("aria-expanded", "true");
    expect(within(menu).getByRole("link", { name: "Лента заявок" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Доска" })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("button", { name: "Команда" }));
    expect(within(menu).getByRole("link", { name: "Добавление менеджера" })).toHaveAttribute("href", "/pro/team/add-manager");
    expect(within(menu).getByRole("link", { name: "Задачи команды" })).toHaveAttribute("href", "/pro/team/tasks");
    fireEvent.click(within(menu).getByRole("button", { name: "Настройки" }));
    const settings = within(menu).getByRole("region", { name: "Настройки" });
    fireEvent.click(within(settings).getByRole("button", { name: "Шаблоны" }));
    expect(within(settings).getByRole("link", { name: "Ответы клиенту" })).toBeInTheDocument();
    fireEvent.click(within(settings).getByRole("link", { name: "Статусы этапов" }));
    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Меню исполнителя" })).not.toBeInTheDocument(),
    );
  });
});

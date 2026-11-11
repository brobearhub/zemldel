import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import type { RequestProDto } from "@/entities/request";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { CabinetSidebarProvider } from "@/shared/ui/CabinetSidebarContext";
import { CabinetDesktopSidebar } from "@/widgets/cabinet-chrome/ui/CabinetDesktopSidebar";
import { ProRequestWorkspace } from "./ProRequestWorkspace";

const navigation = vi.hoisted(() => ({
  pathname: "/pro/requests/first-request",
  wide: true,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));
vi.mock("@mui/material/useMediaQuery", () => ({
  default: () => navigation.wide,
}));
vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        status: "authenticated",
        user: { accountKind: "PROVIDER" },
      },
    }),
}));
vi.mock("@/widgets/cabinet-chrome/ui/CabinetNavigationPanel", () => ({
  CabinetNavigationPanel: () => <nav>Меню</nav>,
}));
vi.mock("@/widgets/cabinet-chrome/ui/CabinetSettingsPanel", () => ({
  CabinetSettingsPanel: () => <div>Настройки</div>,
}));
vi.mock("@/widgets/cabinet-chrome/ui/CabinetSidebarFooter", () => ({
  CabinetSidebarFooter: ({
    collapsed,
    onToggleCollapsed,
    onOpenSettings,
    onBack,
  }: {
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onOpenSettings: () => void;
    onBack: () => void;
  }) => (
    <>
      <button onClick={onToggleCollapsed}>
        {collapsed ? "Развернуть меню" : "Свернуть меню"}
      </button>
      <button onClick={onOpenSettings}>Настройки</button>
      <button onClick={onBack}>Назад в меню</button>
    </>
  ),
}));
vi.mock("./ProRequestDetails", () => ({
  ProRequestDetails: () => <div>Заявка</div>,
}));
vi.mock("@/widgets/chat/ui/ServiceRequestChatPanel", () => ({
  ServiceRequestChatPanel: ({ onCollapse }: { onCollapse?: () => void }) => (
    <>
      {onCollapse ? <button onClick={onCollapse}>Свернуть чат</button> : null}
      <input aria-label="Сообщение" />
    </>
  ),
}));

const request = { id: "first-request", status: "NEW" } as RequestProDto;

function Workspace() {
  return (
    <ThemeProvider theme={createAppTheme("light")}>
      <CabinetSidebarProvider>
        <CabinetDesktopSidebar />
        <ProRequestWorkspace initialRequest={request} subtitle="Заявка" />
      </CabinetSidebarProvider>
    </ThemeProvider>
  );
}

function sidebarWidth() {
  return document.documentElement.style.getPropertyValue(
    "--cabinet-sidebar-width",
  );
}

beforeEach(() => {
  navigation.pathname = "/pro/requests/first-request";
  navigation.wide = true;
  localStorage.clear();
  localStorage.setItem("ui.sidebar.pro.collapsed", "0");
});

it("keeps a collapsed chat rail and reopens chat without losing the draft", async () => {
  const user = userEvent.setup();
  render(<Workspace />);
  const input = screen.getByRole("textbox", { name: "Сообщение" });
  const chat = input.parentElement!;
  expect(sidebarWidth()).toBe("80px");
  expect(chat).toHaveStyle({ display: "flex" });
  await user.type(input, "Черновик");
  await user.click(screen.getByRole("button", { name: "Свернуть чат" }));
  expect(screen.getByLabelText("Свёрнутый чат")).toBeVisible();
  expect(chat).toHaveStyle({ display: "none" });
  await user.click(screen.getByRole("button", { name: "Открыть чат" }));
  expect(chat).toHaveStyle({ display: "flex" });
  expect(sidebarWidth()).toBe("80px");
  await user.click(screen.getByRole("button", { name: "Развернуть меню" }));
  expect(sidebarWidth()).toBe("300px");
  expect(chat).toHaveStyle({ display: "none" });
  expect(screen.getByLabelText("Свёрнутый чат")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Открыть чат" }));
  expect(chat).toHaveStyle({ display: "flex" });
  expect(sidebarWidth()).toBe("80px");
  expect(input).toHaveValue("Черновик");
  expect(screen.queryByLabelText("Свёрнутый чат")).not.toBeInTheDocument();
  expect(chat).toHaveStyle({ display: "flex" });
  expect(input).toHaveValue("Черновик");
  expect(localStorage.getItem("ui.sidebar.pro.collapsed")).toBe("0");
  await user.click(screen.getByRole("button", { name: "Развернуть меню" }));
  expect(screen.getByRole("button", { name: "Открыть чат" })).toBeVisible();
});

it("resets the menu on entering another request and restores the preference outside details", async () => {
  const user = userEvent.setup();
  const view = render(<Workspace />);
  await user.click(screen.getByRole("button", { name: "Развернуть меню" }));
  navigation.pathname = "/pro/requests/second-request";
  view.rerender(<Workspace />);
  expect(sidebarWidth()).toBe("80px");
  for (const path of ["/pro/requests/feed", "/pro/requests/board"]) {
    navigation.pathname = path;
    view.rerender(<Workspace />);
    expect(sidebarWidth()).toBe("300px");
  }
  navigation.pathname = "/pro/requests/first-request";
  view.rerender(<Workspace />);
  expect(sidebarWidth()).toBe("80px");
});

it("hides chat while the sidebar settings are expanded", async () => {
  const user = userEvent.setup();
  render(<Workspace />);
  const chat = screen.getByRole("textbox").parentElement!;
  await user.click(screen.getByRole("button", { name: "Настройки" }));
  expect(sidebarWidth()).toBe("300px");
  expect(chat).toHaveStyle({ display: "none" });
  await user.click(screen.getByRole("button", { name: "Открыть чат" }));
  expect(sidebarWidth()).toBe("80px");
  expect(chat).toHaveStyle({ display: "flex" });
});

it("keeps chat visible on mobile even after expanding the desktop menu", async () => {
  const user = userEvent.setup();
  const view = render(<Workspace />);
  await user.click(screen.getByRole("button", { name: "Развернуть меню" }));
  navigation.wide = false;
  view.rerender(<Workspace />);
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Свернуть чат" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox").parentElement).toHaveStyle({
    display: "flex",
  });
});

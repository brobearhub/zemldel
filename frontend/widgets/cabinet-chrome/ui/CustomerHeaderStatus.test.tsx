import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { CabinetDesktopBar } from "./CabinetDesktopBar";
import { Header } from "@/widgets/header/ui";

const auth = vi.hoisted(() => ({
  status: "authenticated",
  user: { id: "customer", accountKind: "CUSTOMER", systemRole: "CUSTOMER" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@mui/material/useMediaQuery", () => ({ default: () => true }));
vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (selector: (state: { auth: typeof auth }) => unknown) => selector({ auth }),
}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => ({ unreadByRequestId: {} }),
}));
vi.mock("@/widgets/header/ui/HeaderLogo", () => ({ HeaderLogo: () => null }));
vi.mock("@/widgets/header/ui/HeaderCity", () => ({ HeaderCity: () => null }));
vi.mock("@/widgets/header/ui/HeaderNav", () => ({ HeaderNav: () => null }));
vi.mock("@/widgets/header/ui/ProfileMenu", () => ({ ProfileMenu: () => null }));
vi.mock("@/widgets/mobile-navigation/ui/MobileNavigation", () => ({ MobileMenuButton: () => null }));

function renderWithTheme(element: React.ReactNode) {
  return render(<ThemeProvider theme={createAppTheme("light")}>{element}</ThemeProvider>);
}

describe("customer header clock", () => {
  beforeEach(() => {
    auth.status = "authenticated";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 8, 12, 34));
  });

  afterEach(() => vi.useRealTimers());

  it("shows the clock, date and customer notifications in the cabinet", () => {
    renderWithTheme(<CabinetDesktopBar items={[]} alignWithWorkspace />);

    expect(screen.getByText("12:34")).toBeInTheDocument();
    expect(screen.getByText("8 ноября 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Документы и доступ к паспорту" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть напоминания" })).not.toBeInTheDocument();
  });

  it("shows the clock and date to the signed-in customer on public pages", () => {
    renderWithTheme(<Header />);

    expect(screen.getByText("12:34")).toBeInTheDocument();
    expect(screen.getByText("8 ноября 2026")).toBeInTheDocument();
    expect(within(screen.getByText("12:34").parentElement!).getByRole(
      "link",
      { name: "Документы и доступ к паспорту" },
    )).toBeInTheDocument();
  });

  it("does not add the customer clock for guests", () => {
    auth.status = "unauthenticated";
    renderWithTheme(<Header />);

    expect(screen.queryByText("12:34")).not.toBeInTheDocument();
  });
});

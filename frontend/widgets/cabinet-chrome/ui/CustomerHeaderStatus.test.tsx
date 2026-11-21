import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { CabinetDesktopBar } from "./CabinetDesktopBar";
import { Header } from "@/widgets/header/ui";

const auth = vi.hoisted(() => ({
  status: "authenticated",
  user: {
    id: "customer",
    accountKind: "CUSTOMER",
    systemRole: "CUSTOMER",
    memberships: [],
    activeProviderId: null,
  },
}));
const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@mui/material/useMediaQuery", () => ({ default: () => true }));
vi.mock("@/core/store/hooks", () => ({
  useAppSelector: (selector: (state: { auth: typeof auth }) => unknown) =>
    selector({ auth }),
}));
vi.mock("@/widgets/chat/socket/ChatSocketContext", () => ({
  useChatSocket: () => ({ unreadByRequestId: {} }),
  useChatUnreadCount: () => 0,
}));
vi.mock("@/widgets/header/ui/HeaderLogo", () => ({ HeaderLogo: () => null }));
vi.mock("@/widgets/header/ui/HeaderCity", () => ({ HeaderCity: () => null }));
vi.mock("@/widgets/header/ui/HeaderNav", () => ({ HeaderNav: () => null }));
vi.mock("@/widgets/header/ui/ProfileMenu", () => ({ ProfileMenu: () => null }));
vi.mock("@/widgets/mobile-navigation/ui/MobileNavigation", () => ({
  MobileMenuButton: () => null,
}));

function renderWithTheme(element: React.ReactNode) {
  return render(
    <ThemeProvider theme={createAppTheme("light")}>{element}</ThemeProvider>,
  );
}

describe("customer header clock", () => {
  beforeEach(() => {
    route.pathname = "/";
    auth.status = "authenticated";
    auth.user.accountKind = "CUSTOMER";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 8, 12, 34));
  });

  afterEach(() => vi.useRealTimers());

  it("shows the clock, date and customer notifications in the cabinet", () => {
    renderWithTheme(
      <CabinetDesktopBar
        items={[]}
        alignWithWorkspace
      />,
    );

    expect(screen.getByText("12:34")).toBeInTheDocument();
    expect(screen.getByText("8 ноября 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Открыть оповещения" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Открыть напоминания" }),
    ).not.toBeInTheDocument();
  });

  it("shows the clock and date to the signed-in customer on public pages", () => {
    renderWithTheme(<Header />);

    expect(screen.getByText("12:34")).toBeInTheDocument();
    expect(screen.getByText("8 ноября 2026")).toBeInTheDocument();
    expect(
      within(screen.getByText("12:34").parentElement!).getByRole("link", {
        name: "Открыть оповещения",
      }),
    ).toBeInTheDocument();
  });

  it("does not add the customer clock for guests", () => {
    auth.status = "unauthenticated";
    renderWithTheme(<Header />);

    expect(screen.queryByText("12:34")).not.toBeInTheDocument();
  });

  it.each(["unauthenticated", "authenticated"])(
    "shows the services and lands navigation on the homepage for %s users",
    (status) => {
      auth.status = status;
      renderWithTheme(<Header />);

      const catalog = within(
        screen.getByRole("navigation", { name: "Каталог услуг и участков" }),
      );
      expect(catalog.getByRole("link", { name: "Услуги" })).toHaveAttribute(
        "href",
        "/#home-services",
      );
      expect(catalog.getByRole("link", { name: "Услуги" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(catalog.getByRole("link", { name: "Участки" })).toHaveAttribute(
        "href",
        "/lands",
      );
    },
  );

  it.each(["guest", "customer", "provider"])(
    "keeps the catalog navigation on /lands with the correct active link for %s",
    (role) => {
      route.pathname = "/lands";
      auth.status = role === "guest" ? "unauthenticated" : "authenticated";
      auth.user.accountKind = role === "provider" ? "PROVIDER" : "CUSTOMER";
      renderWithTheme(<Header />);

      const catalog = within(
        screen.getByRole("navigation", { name: "Каталог услуг и участков" }),
      );
      const services = catalog.getByRole("link", { name: "Услуги" });
      expect(services).toHaveAttribute("href", "/#home-services");
      expect(services).not.toHaveAttribute("aria-current");
      expect(catalog.getByRole("link", { name: "Участки" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      if (role === "provider") {
        expect(
          screen.getByRole("link", { name: "Открыть напоминания" }),
        ).toBeInTheDocument();
      }
    },
  );

  it.each(["/lands/mine", "/lands/example", "/lands/new", "/lands/example/edit"])(
    "keeps the provider catalog header on %s",
    (pathname) => {
      route.pathname = pathname;
      auth.user.accountKind = "PROVIDER";
      renderWithTheme(<Header />);

      const catalog = within(
        screen.getByRole("navigation", { name: "Каталог услуг и участков" }),
      );
      expect(catalog.getByRole("link", { name: "Услуги" })).toHaveAttribute(
        "href",
        "/#home-services",
      );
      expect(catalog.getByRole("link", { name: "Участки" })).toHaveAttribute(
        "aria-current",
        "location",
      );
      expect(
        screen.getByRole("link", { name: "Открыть напоминания" }),
      ).toBeInTheDocument();
    },
  );

  it("shows public catalogs instead of provider service management on the provider homepage", () => {
    auth.user.accountKind = "PROVIDER";
    renderWithTheme(<Header />);

    const catalog = within(
      screen.getByRole("navigation", { name: "Каталог услуг и участков" }),
    );
    expect(catalog.getByRole("link", { name: "Услуги" })).toHaveAttribute(
      "href",
      "/#home-services",
    );
    expect(catalog.getByRole("link", { name: "Участки" })).toHaveAttribute(
      "href",
      "/lands",
    );
    expect(
      screen.queryByRole("link", { name: "Заявки" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Открыть напоминания" }),
    ).toBeInTheDocument();
  });
});

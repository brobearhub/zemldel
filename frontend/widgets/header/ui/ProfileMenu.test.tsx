import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import { createAppTheme } from "@/core/theme/createAppTheme";
import type { AuthMembership, AuthPerson } from "@/core/auth/authorization";
import { makeStore } from "@/core/store/store";
import { setAuthenticated, setUnauthenticated } from "@/core/store/authSlice";
import { ProfileMenu } from "./ProfileMenu";

const navigation = vi.hoisted(() => ({
  pathname: "/service/123",
  push: vi.fn(),
  search: "q=1",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function avatarHasAccentRing(root: ParentNode): boolean {
  const avatar = root.querySelector(".MuiAvatar-root");
  if (!avatar) return false;
  const emotionClasses = [...avatar.classList].filter((name) => name.startsWith("css-"));
  if (emotionClasses.length === 0) return false;
  return [...document.styleSheets].some((sheet) => {
    try {
      return [...sheet.cssRules].some((rule) => {
        if (!(rule instanceof CSSStyleRule)) return false;
        const matchesAvatar = emotionClasses.some((name) => rule.selectorText.startsWith(`.${name}`));
        if (!matchesAvatar) return false;
        const cssText = rule.cssText;
        return cssText.includes("solid") && cssText.includes("outline") && cssText.includes("2px");
      });
    } catch {
      return false;
    }
  });
}

const membership: AuthMembership = {
  providerId: "provider-1",
  providerName: "ооо Бурый Медведь",
  providerSlug: "ooo-buryy-medved",
  providerType: "COMPANY",
  providerCity: null,
  providerPerson: null,
  role: "OWNER",
  status: "ACTIVE",
};

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("ProfileMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
    navigation.pathname = "/service/123";
    navigation.search = "q=1";
  });

  function renderWithAuthState(
    state: "unauth" | "customer" | "provider" | "platformAdmin",
    options?: {
      readonly layout?: "popover" | "inline" | "sheet";
      readonly onNavigate?: () => void;
      readonly withMembership?: boolean;
      readonly membership?: AuthMembership;
      readonly name?: string | null;
      readonly person?: AuthPerson | null;
    },
  ) {
    const store = makeStore();

    if (state === "unauth") {
      store.dispatch(setUnauthenticated());
    } else {
      store.dispatch(
        setAuthenticated({
          id: "user-1",
          email: "user@example.com",
          name: options?.name === undefined ? "User Name" : options.name,
          person: options?.person ?? null,
          image: null,
          phone: null,
          systemRole: state === "platformAdmin" ? "PLATFORM_ADMIN" : "CUSTOMER",
          accountKind: state === "provider" ? "PROVIDER" : "CUSTOMER",
          activeProviderId: null,
          customerCity: null,
          memberships: options?.membership
            ? [options.membership]
            : options?.withMembership
              ? [membership]
              : [],
        })
      );
    }

    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <ThemeProvider theme={createAppTheme("light")}>
          <ProfileMenu
            layout={options?.layout}
            onNavigate={options?.onNavigate}
          />
        </ThemeProvider>
      </Provider>
    );

    return { user };
  }

  it("в drawer называет вход «Войти» и не вкладывает регистрацию", async () => {
    const store = makeStore();
    store.dispatch(setUnauthenticated());
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <ThemeProvider theme={createAppTheme("light")}>
          <ProfileMenu showLabel forceLabel layout="inline" />
        </ThemeProvider>
      </Provider>,
    );

    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(screen.getByRole("button", { name: "Клиент" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Исполнитель" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Регистрация" })).not.toBeInTheDocument();
  });

  it("does not show admin link for unauthenticated user", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByText("Войти")).toBeInTheDocument();
    expect(screen.getByText("Клиент")).toBeInTheDocument();
    expect(screen.getByText("Исполнитель")).toBeInTheDocument();
    expect(screen.getByText("Регистрация")).toBeInTheDocument();
    expect(screen.queryByText("Админка")).not.toBeInTheDocument();
  });

  it("navigates to /signin with returnTo=current page on regular sign-in", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));
    await user.click(screen.getByText("Клиент"));

    expect(navigation.push).toHaveBeenCalledWith("/signin?returnTo=%2Fservice%2F123%3Fq%3D1");
  });

  it.each(["/forgot-password", "/reset-password", "/signin", "/signup"])(
    "opens sign-in with the cabinet as the return path from %s",
    async (pathname: string) => {
      navigation.pathname = pathname;
      const { user } = renderWithAuthState("unauth");

      await user.hover(screen.getByLabelText("Профиль"));
      await user.click(screen.getByText("Клиент"));

      expect(navigation.push).toHaveBeenCalledWith("/signin?returnTo=%2Fprofile");
    },
  );

  it("navigates to /signin with returnTo=/pro/requests/feed on pro sign-in", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));
    await user.click(screen.getByText("Исполнитель"));

    expect(navigation.push).toHaveBeenCalledWith("/signin?returnTo=%2Fpro%2Frequests%2Ffeed");
  });

  it("does not show admin link for CUSTOMER", async () => {
    const { user } = renderWithAuthState("customer");

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByText("Мой профиль")).toBeInTheDocument();
    expect(screen.queryByText("Админка")).not.toBeInTheDocument();
  });

  it.each([
    ["Заявки", "requests"],
    ["Документы", "documents"],
    ["История", "stories"],
    ["Мой профиль", "profile"],
  ])("открывает раздел клиента «%s» и закрывает меню", async (label: string, section: string) => {
    navigation.pathname = "/profile";
    navigation.search = `section=${section}`;
    const onNavigate = vi.fn();
    const { user } = renderWithAuthState("customer", { onNavigate });

    await user.click(screen.getByRole("button", { name: "Профиль" }));

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Заявки",
      "Документы",
      "История",
      "Мой профиль",
      "Выйти",
    ]);
    expect(screen.getAllByRole("menuitem").filter((item) => item.getAttribute("aria-current") === "page"))
      .toEqual([screen.getByRole("menuitem", { name: label })]);

    await user.click(screen.getByRole("menuitem", { name: label }));

    expect(navigation.push).toHaveBeenCalledWith(`/profile?section=${section}`);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Профиль" })).not.toHaveAttribute("aria-expanded");
  });

  it.each(["inline", "sheet"] as const)(
    "дублирует разделы клиента в меню %s и открывает личные данные",
    async (layout: "inline" | "sheet") => {
      const onNavigate = vi.fn();
      const { user } = renderWithAuthState("customer", { layout, onNavigate });
      if (layout === "inline") {
        await user.click(screen.getByRole("button", { name: "Профиль" }));
      }

      expect(screen.getByRole("button", { name: "Заявки" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Документы" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "История" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Мой профиль" }));

      expect(navigation.push).toHaveBeenCalledWith("/profile?section=profile");
      expect(onNavigate).toHaveBeenCalledOnce();
    },
  );

  it("shows admin link for PLATFORM_ADMIN and navigates to /admin", async () => {
    const { user } = renderWithAuthState("platformAdmin");

    await user.hover(screen.getByLabelText("Профиль"));

    const adminItem = screen.getByText("Админка");
    expect(adminItem).toBeInTheDocument();

    await user.click(adminItem);
    expect(navigation.push).toHaveBeenCalledWith("/admin");
  });

  it("выделяет «Заявки» на странице заявки заказчика", async () => {
    navigation.pathname = "/profile/requests/1";
    const { user } = renderWithAuthState("customer", { withMembership: true });

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByRole("menuitem", { name: "Заявки" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("menuitem", { name: "Мой профиль" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("menuitem", { name: "Кабинет исполнителя" })).not.toBeInTheDocument();
  });

  it.each(["/pro/services", "/pro/settings/account", "/profile", "/"])(
    "сохраняет идентичность исполнителя на %s и ведёт в единый профиль",
    async (pathname) => {
      navigation.pathname = pathname;
      window.localStorage.setItem("ui.profileMenu.providerMode", "contact");
      const { user } = renderWithAuthState("provider", { withMembership: true });
      const profile = screen.getByRole("link", { name: "Мой профиль" });
      expect(profile).toHaveAttribute("href", "/pro/settings/profile");
      expect(profile).toHaveTextContent("БМ");
      expect(avatarHasAccentRing(profile)).toBe(true);
      await user.hover(profile);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.queryByText("Контактное лицо")).not.toBeInTheDocument();
    },
  );

  it.each(["SELF_EMPLOYED", "SOLE_PROPRIETOR", "INDIVIDUAL"] as const)(
    "использует единый профиль для %s",
    (providerType) => {
      renderWithAuthState("provider", {
        membership: { ...membership, providerType, providerName: "Павел Усов", providerPerson: { lastName: "Усов", firstName: "Павел", middleName: "Николаевич" } },
      });
      expect(screen.getByRole("link", { name: "Мой профиль" })).toHaveAttribute("href", "/pro/settings/profile");
      expect(screen.getByRole("link", { name: "Мой профиль" })).toHaveTextContent("ПУ");
    },
  );

  it("ведёт исполнителя без профиля в создание профиля", () => {
    renderWithAuthState("provider");
    expect(screen.getByRole("link", { name: "Мой профиль" })).toHaveAttribute("href", "/providers/new");
  });

  it("заказчику пишет «Имя Ф.» без подписи «Контактное лицо»", async () => {
    const { user } = renderWithAuthState("customer");

    await user.hover(screen.getByLabelText("Профиль"));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("User N.")).toBeInTheDocument();
    expect(within(menu).queryByText("Контактное лицо")).not.toBeInTheDocument();
  });

  it("не обводит аватар вне кабинета профессионала", () => {
    navigation.pathname = "/profile";
    renderWithAuthState("customer");

    expect(avatarHasAccentRing(screen.getByLabelText("Профиль"))).toBe(false);
  });
});


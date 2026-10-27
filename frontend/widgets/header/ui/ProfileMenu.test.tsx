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
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams("q=1"),
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
  });

  function renderWithAuthState(
    state: "unauth" | "customer" | "provider" | "platformAdmin",
    options?: {
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
          linkedAuthProviders: [],
          stepUpVerifiedAt: {},
        })
      );
    }

    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <ThemeProvider theme={createAppTheme("light")}>
          <ProfileMenu />
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

  it("navigates to /signin with returnTo=/pro on pro sign-in", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));
    await user.click(screen.getByText("Исполнитель"));

    expect(navigation.push).toHaveBeenCalledWith("/signin?returnTo=%2Fpro");
  });

  it("does not show admin link for CUSTOMER", async () => {
    const { user } = renderWithAuthState("customer");

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByText("Мой профиль")).toBeInTheDocument();
    expect(screen.queryByText("Админка")).not.toBeInTheDocument();
  });

  it("shows admin link for PLATFORM_ADMIN and navigates to /admin", async () => {
    const { user } = renderWithAuthState("platformAdmin");

    await user.hover(screen.getByLabelText("Профиль"));

    const adminItem = screen.getByText("Админка");
    expect(adminItem).toBeInTheDocument();

    await user.click(adminItem);
    expect(navigation.push).toHaveBeenCalledWith("/admin");
  });

  it("выделяет «Мой профиль», когда открыт профиль заказчика", async () => {
    navigation.pathname = "/profile/requests/1";
    const { user } = renderWithAuthState("customer", { withMembership: true });

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByRole("menuitem", { name: "Мой профиль" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("menuitem", { name: "Кабинет исполнителя" })).not.toBeInTheDocument();
  });

  it("в кабинете показывает организацию и ссылку на контактное лицо", async () => {
    navigation.pathname = "/pro/services";
    const { user } = renderWithAuthState("provider", { withMembership: true });

    const cabinetButton = screen.getByRole("button", { name: "ООО Бурый Медведь" });
    await user.hover(cabinetButton);

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Организация")).toBeInTheDocument();
    expect(within(menu).getByText("ООО Бурый Медведь")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Бурый Медведь/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Мой профиль" })).not.toBeInTheDocument();
    expect(avatarHasAccentRing(cabinetButton)).toBe(true);

    await user.click(screen.getByRole("menuitem", { name: /Контактное лицо/ }));
    expect(navigation.push).toHaveBeenCalledWith("/profile?section=profile");
  });

  it("у контактного лица подписывает «Контактное лицо» и ведёт в кабинет по названию исполнителя", async () => {
    navigation.pathname = "/profile";
    const { user } = renderWithAuthState("provider", { withMembership: true });

    const profileButton = screen.getByRole("button", { name: "Name U." });
    expect(avatarHasAccentRing(profileButton)).toBe(false);
    await user.hover(profileButton);

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Контактное лицо")).toBeInTheDocument();
    expect(within(menu).getByText("Name U.")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Контактное лицо/ })).not.toBeInTheDocument();

    const cabinetItem = screen.getByRole("menuitem", { name: /ООО Бурый Медведь/ });
    expect(within(cabinetItem).getByText("Организация")).toBeInTheDocument();
    await user.click(cabinetItem);
    expect(navigation.push).toHaveBeenCalledWith("/pro");
  });

  it("на публичной странице даёт и кабинет, и контактное лицо", async () => {
    navigation.pathname = "/providers/ooo-buryy-medved";
    const { user } = renderWithAuthState("provider", { withMembership: true });

    await user.hover(screen.getByRole("button", { name: "ООО Бурый Медведь" }));

    expect(screen.getByRole("menuitem", { name: /Контактное лицо/ })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: /ООО Бурый Медведь/ }));
    expect(navigation.push).toHaveBeenCalledWith("/pro");
  });

  it("вне кабинета помнит, что исполнитель переключился на контактное лицо", async () => {
    window.localStorage.setItem("ui.profileMenu.providerMode", "contact");
    const { user } = renderWithAuthState("provider", { withMembership: true });

    await user.hover(screen.getByRole("button", { name: "Name U." }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByText("Контактное лицо")).toHaveLength(2);
    expect(screen.getByRole("menuitem", { name: /ООО Бурый Медведь/ })).toBeInTheDocument();
  });

  it("самозанятого называет «Фамилия И. О.» с подписью «Самозанятый»", async () => {
    navigation.pathname = "/pro";
    const { user } = renderWithAuthState("provider", {
      membership: {
        ...membership,
        providerName: "Павел Усов",
        providerType: "SELF_EMPLOYED",
        providerPerson: { lastName: "Усов", firstName: "Павел", middleName: "Николаевич" },
      },
    });

    await user.hover(screen.getByRole("button", { name: "Усов П. Н." }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Самозанятый")).toBeInTheDocument();
    expect(within(menu).getByText("Усов П. Н.")).toBeInTheDocument();
  });

  it("контактное лицо исполнителя называет «Фамилия И. О.»", async () => {
    navigation.pathname = "/profile";
    const { user } = renderWithAuthState("provider", {
      withMembership: true,
      person: { lastName: "Усов", firstName: "Павел", middleName: "Николаевич" },
    });

    const button = screen.getByRole("button", { name: "Усов П. Н." });
    expect(button).toHaveTextContent("ПУ");
    await user.hover(button);

    expect(within(screen.getByRole("menu")).getByText("Усов П. Н.")).toBeInTheDocument();
  });

  it("без имени показывает почту один раз и берёт инициал из неё", async () => {
    navigation.pathname = "/profile";
    const { user } = renderWithAuthState("provider", { withMembership: true, name: null });

    const button = screen.getByRole("button", { name: "user@example.com" });
    expect(button).toHaveTextContent("U");
    await user.hover(button);

    expect(within(screen.getByRole("menu")).getAllByText("user@example.com")).toHaveLength(1);
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


import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import { createAppTheme } from "@/core/theme/createAppTheme";
import type { AuthMembership } from "@/core/auth/authorization";
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
        return cssText.includes("dashed") && cssText.includes("accent") && cssText.includes("2px");
      });
    } catch {
      return false;
    }
  });
}

const membership: AuthMembership = {
  providerId: "provider-1",
  providerName: "Студия",
  providerSlug: "studio",
  providerType: "SELF_EMPLOYED",
  providerCity: null,
  role: "OWNER",
  status: "ACTIVE",
};

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("ProfileMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.pathname = "/service/123";
  });

  function renderWithAuthState(
    state: "unauth" | "customer" | "provider" | "platformAdmin",
    options?: { readonly withMembership?: boolean },
  ) {
    const store = makeStore();

    if (state === "unauth") {
      store.dispatch(setUnauthenticated());
    } else {
      store.dispatch(
        setAuthenticated({
          id: "user-1",
          email: "user@example.com",
          name: "User Name",
          image: null,
          phone: null,
          systemRole: state === "platformAdmin" ? "PLATFORM_ADMIN" : "CUSTOMER",
          accountKind: state === "provider" ? "PROVIDER" : "CUSTOMER",
          activeProviderId: null,
          customerCity: null,
          memberships: options?.withMembership ? [membership] : [],
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

  it("выделяет «Кабинет исполнителя», когда открыт кабинет", async () => {
    navigation.pathname = "/pro/services";
    const { user } = renderWithAuthState("provider", { withMembership: true });

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByRole("menuitem", { name: "Кабинет исполнителя" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("menuitem", { name: "Мой профиль" })).not.toBeInTheDocument();
    expect(avatarHasAccentRing(screen.getByLabelText("Профиль"))).toBe(true);
  });

  it("не обводит аватар вне кабинета профессионала", () => {
    navigation.pathname = "/profile";
    renderWithAuthState("customer");

    expect(avatarHasAccentRing(screen.getByLabelText("Профиль"))).toBe(false);
  });
});


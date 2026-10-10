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
  const emotionClass = [...avatar.classList].find((name) => name.startsWith("css-"));
  if (!emotionClass) return false;
  return [...document.styleSheets].some((sheet) => {
    try {
      return [...sheet.cssRules].some((rule) => {
        if (!(rule instanceof CSSStyleRule)) return false;
        const outline = rule.style.getPropertyValue("outline");
        return (
          rule.selectorText.startsWith(`.${emotionClass}`) &&
          outline.includes("2px") &&
          outline.includes("solid") &&
          outline.includes("var(--mui-palette-accent-main)") &&
          rule.style.getPropertyValue("outline-offset") === "2px"
        );
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
    state: "unauth" | "customer" | "platformAdmin",
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

  it("does not show admin link for unauthenticated user", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByText("Войти")).toBeInTheDocument();
    expect(screen.getByText("Войти исполнителю")).toBeInTheDocument();
    expect(screen.getByText("Регистрация")).toBeInTheDocument();
    expect(screen.queryByText("Админка")).not.toBeInTheDocument();
  });

  it("navigates to /signin with returnTo=current page on regular sign-in", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));
    await user.click(screen.getByText("Войти"));

    expect(navigation.push).toHaveBeenCalledWith("/signin?returnTo=%2Fservice%2F123%3Fq%3D1");
  });

  it("navigates to /signin with returnTo=/pro on pro sign-in", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));
    await user.click(screen.getByText("Войти исполнителю"));

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
    expect(screen.getByRole("menuitem", { name: "Кабинет профессионала" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("выделяет «Кабинет профессионала», когда открыт кабинет", async () => {
    navigation.pathname = "/pro/services";
    const { user } = renderWithAuthState("customer", { withMembership: true });

    await user.hover(screen.getByLabelText("Профиль"));

    expect(screen.getByRole("menuitem", { name: "Кабинет профессионала" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("menuitem", { name: "Мой профиль" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(avatarHasAccentRing(screen.getByLabelText("Профиль"))).toBe(true);
  });

  it("не обводит аватар вне кабинета профессионала", () => {
    navigation.pathname = "/profile";
    renderWithAuthState("customer");

    expect(avatarHasAccentRing(screen.getByLabelText("Профиль"))).toBe(false);
  });
});


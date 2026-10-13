import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { makeStore } from "@/core/store/store";
import { setAuthenticated, setUnauthenticated } from "@/core/store/authSlice";
import { HeaderNav } from "./HeaderNav";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

function renderNav(state: "unauth" | "customer") {
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
        systemRole: "CUSTOMER",
        accountKind: "CUSTOMER",
        activeProviderId: null,
        customerCity: null,
        memberships: [],
        linkedAuthProviders: [],
        stepUpVerifiedAt: {},
      }),
    );
  }

  render(
    <Provider store={store}>
      <ThemeProvider theme={createAppTheme("light")}>
        <HeaderNav showLabels />
      </ThemeProvider>
    </Provider>,
  );
}

describe("HeaderNav drawer", () => {
  it("ставит регистрацию в общий список пунктов для гостя", () => {
    renderNav("unauth");

    const registration = screen.getByRole("link", { name: "Регистрация" });
    expect(registration).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Заявки" }).compareDocumentPosition(registration)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("не показывает регистрацию вошедшему пользователю", () => {
    renderNav("customer");

    expect(screen.queryByRole("link", { name: "Регистрация" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Профиль" })).toBeInTheDocument();
  });
});

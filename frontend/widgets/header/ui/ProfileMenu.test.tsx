import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "@/core/store/store";
import { setAuthenticated, setUnauthenticated } from "@/core/store/authSlice";
import { ProfileMenu } from "./ProfileMenu";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/service/123",
  useSearchParams: () => new URLSearchParams("q=1"),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("ProfileMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithAuthState(state: "unauth" | "customer" | "platformAdmin") {
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
          memberships: [],
          linkedAuthProviders: [],
          stepUpVerifiedAt: {},
        })
      );
    }

    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <ProfileMenu />
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

    expect(mockPush).toHaveBeenCalledWith("/signin?returnTo=%2Fservice%2F123%3Fq%3D1");
  });

  it("navigates to /signin with returnTo=/pro on pro sign-in", async () => {
    const { user } = renderWithAuthState("unauth");

    await user.hover(screen.getByLabelText("Профиль"));
    await user.click(screen.getByText("Войти исполнителю"));

    expect(mockPush).toHaveBeenCalledWith("/signin?returnTo=%2Fpro");
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
    expect(mockPush).toHaveBeenCalledWith("/admin");
  });
});


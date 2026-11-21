import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SignInPage from "./page";
import { readRegistrationProgress } from "@/features/registration/registration-progress";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  useSession: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams({ returnTo: "/profile" }),
}));
vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
  signIn: mocks.signIn,
}));
vi.mock("@/features/continue-request", () => ({
  usePendingRequestContext: () => ({ loaded: true, draft: null }),
}));
vi.mock("@/shared/ui/LogoFull", () => ({ LogoFull: () => null }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.useSession.mockReturnValue({ data: null, status: "unauthenticated" });
  vi.stubGlobal("fetch", mocks.fetch);
  sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

function respond(body: unknown) {
  mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => body });
}

function submitEmail() {
  render(<SignInPage />);
  expect(screen.queryByRole("link", { name: "Забыли пароль?" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "User@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
}

async function confirmCode(status: "registration_required" | "password_required") {
  const code = await screen.findByLabelText("Код из письма");
  expect(screen.queryByRole("link", { name: "Забыли пароль?" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Отправить новый код через/ })).toBeDisabled();
  respond({ status, email: "user@example.com" });
  fireEvent.change(code, { target: { value: "0123" } });
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить email" }));
}

it("после проверки почты действующего пользователя запрашивает его пароль", async () => {
  respond({ status: "verification_required", resendAt: new Date(Date.now() + 60_000).toISOString() });
  submitEmail();
  await confirmCode("password_required");
  const password = await screen.findByLabelText("Пароль", { selector: "input" });
  expect(screen.getByRole("link", { name: "Забыли пароль?" })).toHaveAttribute("href", "/forgot-password");
  expect(mocks.signIn).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
  respond({ accountKind: "CUSTOMER", hasProviderMembership: false });
  mocks.signIn.mockResolvedValue({ ok: true });
  // Password managers can fill the DOM without dispatching a React change event.
  (password as HTMLInputElement).value = "existing-password";
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/profile"));
  expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
    email: "user@example.com", password: "existing-password", redirect: false,
  });
});

it.each(["CUSTOMER", "PROVIDER"])("возвращает %s к заполнению профиля с подтверждённой почтой", async (accountKind) => {
  respond({ status: "verification_required", accountKind, resendAt: new Date(Date.now() + 60_000).toISOString() });
  submitEmail();
  await confirmCode("registration_required");
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/signup?returnTo=%2Fprofile&account=${accountKind.toLowerCase()}`));
  expect(readRegistrationProgress()).toEqual({ stage: "verified", email: "user@example.com", accountKind });
  expect(mocks.signIn).not.toHaveBeenCalled();
});

it("сразу запрашивает пароль при входе с ранее подтверждённой почтой", async () => {
  respond({ status: "password_required" });
  submitEmail();
  expect(await screen.findByLabelText("Пароль", { selector: "input" })).toBeVisible();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.fetch).toHaveBeenCalledWith("/api/auth/signin/email", expect.objectContaining({
    body: JSON.stringify({ email: "user@example.com" }),
  }));
});

it("показывает поле после определения сессии и принимает email, подставленный браузером", async () => {
  mocks.useSession.mockReturnValue({ data: null, status: "loading" });
  const view = render(<SignInPage />);
  expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  mocks.useSession.mockReturnValue({ data: null, status: "unauthenticated" });
  view.rerender(<SignInPage />);
  (screen.getByLabelText("Email") as HTMLInputElement).value = "Browser@example.com";
  respond({ status: "password_required" });
  fireEvent.click(screen.getByRole("button", { name: "Продолжить" }));
  expect(await screen.findByLabelText("Пароль", { selector: "input" })).toBeVisible();
  expect(mocks.fetch).toHaveBeenCalledWith("/api/auth/signin/email", expect.objectContaining({
    body: JSON.stringify({ email: "browser@example.com" }),
  }));
});

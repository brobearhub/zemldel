import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { createLegacyAuthTheme } from "@/core/theme/legacyAuthTheme";
import { clearRegistrationProgress, saveRegistrationProgress } from "@/features/registration/registration-progress";
import SignUpPage from "./page";

const state = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => state.params,
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));
vi.mock("@/features/continue-request", () => ({
  usePendingRequestContext: () => ({ draft: null, loaded: true }),
}));
vi.mock("@/shared/ui/LogoIcon", () => ({ LogoIcon: () => null }));

const theme = createLegacyAuthTheme("light");
const email = "signup@example.test";
function renderPage() {
  return render(<ThemeProvider theme={theme}><SignUpPage /></ThemeProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  state.params = new URLSearchParams();
  clearRegistrationProgress();
  vi.stubGlobal("fetch", state.fetch);
});
afterEach(() => vi.unstubAllGlobals());

it("при обычной регистрации предлагает выбрать роль после подтверждения email", async () => {
  state.fetch
    .mockResolvedValueOnce(Response.json({ status: "verification_required", resendAt: new Date(Date.now() + 60000).toISOString() }))
    .mockResolvedValueOnce(Response.json({ status: "registration_required", email, accountKind: null }));
  renderPage();
  const emailField = await screen.findByLabelText("Email");
  expect(screen.queryByRole("button", { name: "Исполнитель" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
  expect(state.fetch).not.toHaveBeenCalled();
  fireEvent.change(emailField, { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Получить код" }));
  const code = await screen.findByLabelText("Код из письма");
  fireEvent.change(code, { target: { value: "0001" } });
  fireEvent.click(screen.getByRole("button", { name: "Подтвердить email" }));
  expect(await screen.findByRole("button", { name: "Клиент" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Исполнитель" }));
  expect(state.replace).toHaveBeenCalledWith("/signup?account=provider");
});

it("после обновления страницы восстанавливает подтверждённый адрес, а при истёкшем подтверждении возвращает к получению кода", async () => {
  state.params.set("account", "provider");
  saveRegistrationProgress({ stage: "verified", email, accountKind: "PROVIDER" });
  state.fetch.mockImplementation(async (path: string) => path === "/api/auth/signup"
    ? Response.json({ error: "Подтвердите email ещё раз" }, { status: 403 })
    : Response.json({ version: "v1" }));
  renderPage();
  const emailField = await screen.findByLabelText("Email");
  expect(emailField).toHaveValue(email);
  expect(emailField).toHaveAttribute("readonly");
  fireEvent.change(screen.getByLabelText("Пароль", { selector: "input" }), { target: { value: "secret1" } });
  fireEvent.change(screen.getByLabelText("Подтвердите пароль", { selector: "input" }), { target: { value: "secret1" } });
  const terms = screen.getAllByRole("checkbox");
  await waitFor(() => expect(terms[0]).toBeEnabled());
  terms.forEach((checkbox) => fireEvent.click(checkbox));
  fireEvent.click(screen.getByRole("button", { name: "Создать аккаунт" }));
  expect(await screen.findByRole("button", { name: "Получить код" })).toBeEnabled();
  expect(screen.getByLabelText("Email")).toHaveValue(email);
  expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
});

it("по приглашению использует адрес из карточки даже при сохранённой регистрации другого исполнителя", async () => {
  const path = "/client-invitations/" + "x".repeat(43);
  state.params.set("returnTo", path);
  state.params.set("account", "provider");
  saveRegistrationProgress({ stage: "verified", email: "other@example.test", accountKind: "PROVIDER" });
  state.fetch
    .mockResolvedValueOnce(Response.json({ email, providerName: "Бюро", accepted: false }))
    .mockResolvedValueOnce(Response.json({ status: "verification_required", resendAt: new Date(Date.now() + 60000).toISOString() }));
  renderPage();
  const field = await screen.findByLabelText("Email");
  expect(field).toHaveValue(email);
  expect(field).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("button", { name: "Получить код" }));
  expect(await screen.findByLabelText("Код из письма")).toBeVisible();
  expect(state.fetch).toHaveBeenCalledWith("/api/auth/signup/start", expect.objectContaining({
    body: JSON.stringify({ email, accountKind: "CUSTOMER" }),
  }));
});

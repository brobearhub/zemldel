import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientInvitation } from "./ClientInvitation";

const auth = vi.hoisted(() => ({
  status: "unauthenticated",
  data: null as null | { user: { accountKind: string; email: string } },
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => auth, signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const path = "/client-invitations/" + "a".repeat(43);
const email = "recipient@example.test";
const api = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  auth.data = null;
  auth.status = "unauthenticated";
  api.mockImplementation(async (_url: string, init?: RequestInit) => Response.json(
    init?.method === "POST" ? { clientId: "client" } : { providerName: "Бюро", email, accepted: false },
  ));
  vi.stubGlobal("fetch", api);
});
afterEach(() => vi.unstubAllGlobals());

it("сначала предлагает регистрацию клиента, затем вход и после кнопок объясняет, где появятся заявки", async () => {
  render(<ClientInvitation path={path} />);
  const signup = await screen.findByRole("link", { name: "Регистрация" });
  const signin = screen.getByRole("link", { name: "Войти" });
  const existingAccount = screen.getByText(/Уже есть аккаунт на Земледеле/);
  expect(screen.getByText(/зарегистрируйтесь как клиент/)).toAppearBefore(signup);
  expect(signup).toHaveAttribute("href", `/signup?account=customer&returnTo=${encodeURIComponent(path)}`);
  expect(signup).toHaveClass("MuiButton-colorSecondary");
  expect(signup).toAppearBefore(existingAccount);
  expect(existingAccount).toAppearBefore(signin);
  expect(signin).toHaveAttribute("href", `/signin?returnTo=${encodeURIComponent(path)}`);
  expect(signin).toHaveClass("MuiButton-colorPrimary");
  expect(signin).toAppearBefore(screen.getByText(/В разделе «Заявки»/));
});

it.each([["PROVIDER", email], ["CUSTOMER", "other@example.test"]])("предлагает сменить неподходящий аккаунт", async (accountKind, address) => {
  auth.status = "authenticated";
  auth.data = { user: { accountKind, email: address } };
  render(<ClientInvitation path={path} />);
  expect(await screen.findByRole("button", { name: "Войти с приглашённой почтой" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Подключиться к исполнителю" })).toBeNull();
  expect(api).toHaveBeenCalledTimes(1);
});

it("подключает карточку только по нажатию и открывает заявки после подтверждения сервера", async () => {
  auth.status = "authenticated";
  auth.data = { user: { accountKind: "CUSTOMER", email: email.toUpperCase() } };
  render(<ClientInvitation path={path} />);
  const connect = await screen.findByRole("button", { name: "Подключиться к исполнителю" });
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(connect);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile?section=requests"));
  expect(api).toHaveBeenCalledWith(`/api${path}/accept`, expect.objectContaining({ method: "POST" }));
});

it("открывает автоматически подключённые заявки по уже отправленной ссылке", async () => {
  auth.status = "authenticated";
  auth.data = { user: { accountKind: "CUSTOMER", email } };
  api.mockResolvedValueOnce(Response.json({ providerName: "Бюро", email, accepted: true }));
  render(<ClientInvitation path={path} />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile?section=requests"));
  expect(screen.queryByRole("link", { name: "Открыть мои заявки" })).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(1);
});

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

it("сохраняет приглашение при входе и регистрации без передачи почты в URL", async () => {
  render(<ClientInvitation path={path} />);
  expect(await screen.findByRole("link", { name: "Войти" })).toHaveAttribute("href", `/signin?returnTo=${encodeURIComponent(path)}`);
  expect(screen.getByRole("link", { name: "Зарегистрироваться как клиент" })).toHaveAttribute("href", `/signup?account=customer&returnTo=${encodeURIComponent(path)}`);
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

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TeamInvitation } from "./TeamInvitation";

const state = vi.hoisted(() => ({
  status: "unauthenticated",
  session: null as null | {
    user: { email: string; accountKind: string; person: null };
  },
  replace: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace, refresh: state.refresh }),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: state.status,
    data: state.session,
    update: state.update,
  }),
  signOut: vi.fn(),
}));
const token = "a".repeat(43);
const invitation = {
  providerName: "ООО Бурый медведь",
  role: "EMPLOYEE",
  jobTitle: "Геодезист",
  emailHint: "e***@example.test",
  accepted: false,
};
beforeEach(() => {
  state.status = "unauthenticated";
  state.session = null;
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

it("предлагает вход и регистрацию с возвратом к приглашению, не принимает его при открытии", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(invitation)));
  vi.stubGlobal("fetch", fetchMock);
  render(<TeamInvitation token={token} />);
  await screen.findByText("Должность: Геодезист");
  expect(
    screen.getByRole("link", { name: "Зарегистрироваться" }),
  ).toHaveAttribute(
    "href",
    `/signup?account=provider&returnTo=${encodeURIComponent(`/team-invitations/${token}`)}`,
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method", "POST");
});

it("принимает приглашение новым аккаунтом и открывает назначенные заявки", async () => {
  state.status = "authenticated";
  state.session = {
    user: {
      email: "employee@example.test",
      accountKind: "PROVIDER",
      person: null,
    },
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(invitation)))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "u" })));
  vi.stubGlobal("fetch", fetchMock);
  render(<TeamInvitation token={token} />);
  await screen.findByText("Должность: Геодезист");
  fireEvent.change(screen.getByLabelText(/^Имя/), {
    target: { value: "Иван" },
  });
  fireEvent.change(screen.getByLabelText(/^Фамилия/), {
    target: { value: "Иванов" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Принять приглашение" }));
  await waitFor(() =>
    expect(state.replace).toHaveBeenCalledWith("/pro/assigned"),
  );
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    firstName: "Иван",
    lastName: "Иванов",
  });
  expect(state.update).toHaveBeenCalled();
});

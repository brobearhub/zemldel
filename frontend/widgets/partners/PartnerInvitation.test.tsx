import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PartnerInvitation } from "./PartnerInvitation";

const auth = vi.hoisted(() => ({
  status: "unauthenticated",
  data: null as null | {
    user: {
      email: string;
      accountKind: string;
      activeProviderId: string | null;
      memberships: { providerId: string; providerName: string; role: string }[];
    };
  },
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({
  useSession: () => auth,
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const token = "a".repeat(43);
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  auth.status = "unauthenticated";
  auth.data = null;
  fetchMock = vi.fn(
    async (_url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify(
          init?.method === "POST"
            ? { id: "partner" }
            : {
                providerName: "Бюро",
                emailHint: "n***@example.test",
                accepted: false,
              },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("preserves the invitation through sign-in and provider registration", async () => {
  render(<PartnerInvitation token={token} />);
  expect(
    await screen.findByRole("link", { name: "Войти и подтвердить" }),
  ).toHaveAttribute(
    "href",
    `/signin?returnTo=${encodeURIComponent(`/partner-invitations/${token}`)}`,
  );
  expect(
    screen.getByRole("link", { name: "Зарегистрироваться как исполнитель" }),
  ).toHaveAttribute(
    "href",
    `/signup?account=provider&returnTo=${encodeURIComponent(`/partner-invitations/${token}`)}`,
  );
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(0);
});

it("returns a new provider to the invitation after creating a profile", async () => {
  auth.status = "authenticated";
  auth.data = {
    user: {
      email: "new@example.test",
      accountKind: "PROVIDER",
      activeProviderId: null,
      memberships: [],
    },
  };
  render(<PartnerInvitation token={token} />);
  expect(
    await screen.findByRole("link", { name: "Создать профиль исполнителя" }),
  ).toHaveAttribute(
    "href",
    `/providers/new?returnTo=${encodeURIComponent(`/partner-invitations/${token}`)}`,
  );
  expect(
    screen.queryByRole("button", { name: "Подтвердить партнёрство" }),
  ).toBeNull();
});

it("requires a click to accept and opens partners only after the server confirms", async () => {
  auth.status = "authenticated";
  auth.data = {
    user: {
      email: "new@example.test",
      accountKind: "PROVIDER",
      activeProviderId: "p",
      memberships: [
        { providerId: "p", providerName: "Новый профиль", role: "OWNER" },
      ],
    },
  };
  render(<PartnerInvitation token={token} />);
  const accept = await screen.findByRole("button", {
    name: "Подтвердить партнёрство",
  });
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(0);
  fireEvent.click(accept);
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/partner-invitations/${token}/accept`,
      expect.objectContaining({ method: "POST" }),
    ),
  );
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith("/pro/partners"),
  );
});

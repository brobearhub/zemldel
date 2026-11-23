import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { writeClientData } from "@/entities/provider-client/api";
import { teamApi } from "@/shared/lib/team-api";
import type { ProviderClientDetail } from "@/entities/provider-client/model";
import { ProClientDetails } from "./ProClientDetails";

const actions = vi.hoisted(() => ({ refresh: vi.fn(), confirm: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => actions }));
vi.mock("@/shared/ui/confirm", () => ({ useConfirm: () => actions.confirm }));
vi.mock("@/entities/provider-client/api", () => ({ writeClientData: vi.fn() }));
vi.mock("@/shared/lib/team-api", () => ({ teamApi: vi.fn() }));

const client: ProviderClientDetail = {
  id: "client",
  email: "new@example.test",
  name: null,
  customerUserId: null,
  status: "CONTACT",
  source: "MANUAL",
  invitationVersion: null,
  invitationExpiresAt: null,
  createdAt: "2026-11-21T00:00:00Z",
  ordersCount: 0,
  lastOrderAt: null,
  recentServiceTitles: [],
  statuses: {},
  requests: [],
};
let server: ProviderClientDetail;
const generated = {
  path: "/client-invitations/token",
  version: "first",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

beforeEach(() => {
  vi.resetAllMocks();
  server = client;
  vi.mocked(teamApi).mockImplementation(async () => server);
});

async function issueInvite() {
  const user = userEvent.setup();
  vi.mocked(writeClientData).mockImplementationOnce(async () => {
    server = {
      ...client,
      status: "INVITED",
      invitationVersion: generated.version,
      invitationExpiresAt: generated.expiresAt,
    };
    return generated;
  });
  render(<ProClientDetails client={client} />);
  await user.click(
    screen.getByRole("button", { name: "Пригласить в кабинет" }),
  );
  expect(
    await screen.findByRole("textbox", { name: "Ссылка для клиента" }),
  ).toHaveValue(window.location.origin + generated.path);
  return user;
}

it("retains a generated invite when replacement is cancelled and hides it after revocation", async () => {
  const user = await issueInvite();
  actions.confirm.mockResolvedValueOnce(false);
  await user.click(
    screen.getByRole("button", { name: "Создать новую ссылку" }),
  );
  expect(writeClientData).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("textbox", { name: "Ссылка для клиента" }),
  ).toBeVisible();
  actions.confirm.mockResolvedValueOnce(true);
  vi.mocked(writeClientData).mockImplementationOnce(async () => {
    server = client;
    return { ok: true };
  });
  await user.click(
    screen.getByRole("button", { name: "Отозвать приглашение" }),
  );
  expect(writeClientData).toHaveBeenLastCalledWith(
    "/api/pro/clients/client/invitation",
    "DELETE",
  );
  expect(
    screen.queryByRole("textbox", { name: "Ссылка для клиента" }),
  ).not.toBeInTheDocument();
});

it.each([
  ["CONTACT", null, "Не приглашён"],
  ["INVITED", "replacement", "Приглашение создано"],
  ["CONNECTED", null, "Подключён"],
] as const)(
  "reconciles %s on return to the tab and drops the stale URL",
  async (status, version, label) => {
    await issueInvite();
    server = {
      ...server,
      status,
      invitationVersion: version,
      customerUserId: status === "CONNECTED" ? "recipient" : null,
    };
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByText(label)).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "Ссылка для клиента" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Скопировать ссылку" }),
    ).not.toBeInTheDocument();
  },
);

it("checks the current link again before copying from a still-open tab", async () => {
  const user = await issueInvite();
  const clipboard = vi.spyOn(navigator.clipboard, "writeText");
  server = { ...server, invitationVersion: "replacement" };
  await user.click(screen.getByRole("button", { name: "Скопировать ссылку" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("textbox", { name: "Ссылка для клиента" }),
    ).not.toBeInTheDocument(),
  );
  expect(clipboard).not.toHaveBeenCalled();
});

it("offers work on connected accounts without creating new invitations", async () => {
  server = { ...client, status: "CONNECTED", customerUserId: "existing" };
  await act(async () => {
    render(<ProClientDetails client={server} />);
  });
  expect(screen.getByRole("link", { name: "Создать заявку" })).toHaveAttribute(
    "href",
    "/pro/requests/new?clientId=client",
  );
  expect(
    screen.queryByRole("button", { name: /Пригласить|ссылку|приглашение/i }),
  ).not.toBeInTheDocument();
});

it("keeps links hidden during a failed refresh and restores a still-current link after retry", async () => {
  const user = await issueInvite();
  vi.mocked(teamApi).mockRejectedValueOnce(new Error("offline"));
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(
    screen.queryByRole("textbox", { name: "Ссылка для клиента" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Повторить" }));
  expect(
    await screen.findByRole("textbox", { name: "Ссылка для клиента" }),
  ).toHaveValue(window.location.origin + generated.path);
});

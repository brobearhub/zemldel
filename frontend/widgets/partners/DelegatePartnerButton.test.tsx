import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { DelegatePartnerDialog } from "./DelegatePartnerButton";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(
    async (_url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify(
          init?.method === "POST"
            ? { providerId: "p" }
            : {
                items: [
                  {
                    id: "active",
                    status: "ACTIVE",
                    provider: { id: "p", name: "Партнёр" },
                  },
                  {
                    id: "pending",
                    status: "PENDING",
                    provider: { id: "pending", name: "Неподтверждённый" },
                  },
                ],
              },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("requires an active partner and explicit loss-of-access confirmation before transfer", async () => {
  render(
    <DelegatePartnerDialog
      requestId="request"
      onClose={vi.fn()}
    />,
  );
  await screen.findByRole("combobox", { name: "Партнёр" });
  const submit = screen.getByRole("button", { name: "Передать заявку" });
  expect(submit).toBeDisabled();
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Партнёр" }));
  expect(screen.queryByRole("option", { name: "Неподтверждённый" })).toBeNull();
  fireEvent.click(screen.getByRole("option", { name: "Партнёр" }));
  expect(submit).toBeDisabled();
  expect(
    screen.getByText(/заявка исчезнет из вашего кабинета/),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Я понимаю, что потеряю доступ к этой заявке",
    }),
  );
  fireEvent.click(submit);
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pro/requests/request/delegate",
      expect.objectContaining({
        body: JSON.stringify({ partnerProviderId: "p", confirmed: true }),
      }),
    ),
  );
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith("/pro/requests/board"),
  );
});

it("cancelling makes no write and contract/payment restriction cannot be bypassed in the dialog", async () => {
  const close = vi.fn();
  const view = render(
    <DelegatePartnerDialog
      requestId="request"
      onClose={close}
    />,
  );
  await screen.findByRole("combobox", { name: "Партнёр" });
  fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
  expect(close).toHaveBeenCalledOnce();
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(0);
  view.unmount();
  render(
    <DelegatePartnerDialog
      requestId="request"
      onClose={close}
      blockedReason="Передать можно только заявку без подписанного договора и оплат."
    />,
  );
  expect(
    screen.getByText(/без подписанного договора и оплат/),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Передать заявку" })).toBeNull();
});

it("stays on the request when the server detects a new payment at confirmation time", async () => {
  render(
    <DelegatePartnerDialog
      requestId="request"
      onClose={vi.fn()}
    />,
  );
  await screen.findByRole("combobox", { name: "Партнёр" });
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Партнёр" }));
  fireEvent.click(screen.getByRole("option", { name: "Партнёр" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "В заявке появилась оплата" }), {
      status: 400,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Передать заявку" }));
  await screen.findByText("В заявке появилась оплата");
  expect(router.replace).not.toHaveBeenCalled();
});

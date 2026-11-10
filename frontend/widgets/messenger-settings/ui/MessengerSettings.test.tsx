import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { messengerApi } from "@/entities/messenger/api/messengers";
import { MessengerSettings } from "./MessengerSettings";
import type { MessengerStatus } from "@/entities/messenger/model/types";

vi.mock("@/entities/messenger/api/messengers", () => ({
  messengerApi: {
    status: vi.fn(),
    link: vi.fn(),
    confirm: vi.fn(),
    disconnect: vi.fn(),
    notifications: vi.fn(),
  },
}));

const status: MessengerStatus = {
  platform: "TELEGRAM",
  configured: true,
  connected: false,
  displayName: null,
  notificationsEnabled: false,
  blocked: false,
  pending: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const connected: MessengerStatus = {
  ...status,
  connected: true,
  displayName: "nikolsky",
  notificationsEnabled: true,
};

describe("MessengerSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows availability only for the messenger that cannot be connected yet", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([
      status,
      { ...status, platform: "MAX", configured: false },
    ]);

    render(<MessengerSettings />);

    expect(
      await screen.findByText("Подключение MAX скоро станет доступно"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Подключить Telegram" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Подключить MAX" }),
    ).toBeDisabled();
  });

  it("creates a link before opening the bot and requires a separate confirmation", async () => {
    const expiresAt = new Date(Date.now() + 600000).toISOString();
    vi.mocked(messengerApi.status).mockResolvedValue([status]);
    vi.mocked(messengerApi.link).mockResolvedValue({
      url: "https://t.me/zemledel_agent?start=test",
      expiresAt,
    });
    render(<MessengerSettings />);
    const connect = await screen.findByRole("switch", {
      name: "Подключить Telegram",
    });
    vi.mocked(messengerApi.status).mockResolvedValue([
      { ...status, pending: { id: "token", displayName: null, expiresAt } },
    ]);
    fireEvent.click(connect);
    expect(
      await screen.findByRole("link", { name: "Открыть Telegram" }),
    ).toHaveAttribute("href", "https://t.me/zemledel_agent?start=test");
    expect(messengerApi.confirm).not.toHaveBeenCalled();
  });

  it("only connects after confirming the presented account", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([
      {
        ...status,
        pending: {
          id: "token",
          displayName: "Иван",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
        },
      },
    ]);
    render(<MessengerSettings />);
    const confirm = await screen.findByRole("button", {
      name: "Подтвердить подключение",
    });
    expect(screen.getByText(/аккаунт «Иван»/)).toBeInTheDocument();
    vi.mocked(messengerApi.status).mockResolvedValue([
      {
        ...status,
        connected: true,
        displayName: "Иван",
        notificationsEnabled: true,
      },
    ]);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(messengerApi.confirm).toHaveBeenCalledWith("TELEGRAM", "token"),
    );
    expect(await screen.findByText("Иван")).toBeInTheDocument();
    expect(screen.queryByText(/Аккаунт:/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Отключить Telegram" }),
    ).toBeInTheDocument();
  });

  it("shows a failed connection request without falsely claiming success", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([status]);
    vi.mocked(messengerApi.link).mockRejectedValue(
      new Error("Сервис временно недоступен"),
    );
    render(<MessengerSettings />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "Подключить Telegram" }),
    );
    expect(
      await screen.findByText("Сервис временно недоступен"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Отключить Telegram" }),
    ).not.toBeInTheDocument();
  });

  it("has one connection toggle and keeps the account name with the messenger name", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([connected]);
    render(<MessengerSettings />);
    const account = await screen.findByText("nikolsky");
    expect(account.parentElement).toHaveTextContent("Telegram");
    expect(
      screen.queryByRole("heading", { name: "Мессенджеры" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Отключить Telegram" }),
    ).toBeChecked();
    expect(
      screen.queryByRole("button", { name: "Отключить Telegram" }),
    ).not.toBeInTheDocument();
  });

  it("shows disconnect progress until the mutation and status refresh finish", async () => {
    const mutation = deferred<void>();
    const reload = deferred<MessengerStatus[]>();
    vi.mocked(messengerApi.status)
      .mockResolvedValueOnce([connected])
      .mockReturnValueOnce(reload.promise);
    vi.mocked(messengerApi.disconnect).mockReturnValue(mutation.promise);
    render(<MessengerSettings />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "Отключить Telegram" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Отключаем Telegram…");
    expect(
      screen.getByRole("switch", { name: "Отключить Telegram" }),
    ).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => mutation.resolve());
    expect(screen.getByRole("status")).toHaveTextContent("Отключаем Telegram…");
    await act(async () => reload.resolve([status]));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Подключить Telegram" }),
    ).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores a stale background error while disconnecting", async () => {
    const stale = deferred<MessengerStatus[]>();
    const mutation = deferred<void>();
    vi.mocked(messengerApi.status)
      .mockResolvedValueOnce([connected])
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue([status]);
    vi.mocked(messengerApi.disconnect).mockReturnValue(mutation.promise);
    render(<MessengerSettings />);
    const disconnect = await screen.findByRole("switch", {
      name: "Отключить Telegram",
    });
    fireEvent(window, new Event("focus"));
    fireEvent.click(disconnect);
    await act(async () =>
      stale.reject(new Error("Мессенджеры временно недоступны")),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    await act(async () => mutation.resolve());
    expect(
      screen.getByRole("switch", { name: "Подключить Telegram" }),
    ).toBeEnabled();
  });

  it("does not let a late background response restore a disconnected account", async () => {
    const stale = deferred<MessengerStatus[]>();
    vi.mocked(messengerApi.status)
      .mockResolvedValueOnce([connected])
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue([status]);
    vi.mocked(messengerApi.disconnect).mockResolvedValue(undefined);
    render(<MessengerSettings />);
    const disconnect = await screen.findByRole("switch", {
      name: "Отключить Telegram",
    });
    fireEvent(window, new Event("focus"));
    fireEvent.click(disconnect);
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Подключить Telegram" }),
      ).toBeEnabled(),
    );
    await act(async () => stale.resolve([connected]));
    expect(
      screen.getByRole("switch", { name: "Подключить Telegram" }),
    ).not.toBeChecked();
    expect(screen.queryByText("nikolsky")).not.toBeInTheDocument();
  });

  it("keeps confirmed disconnection when only the follow-up status read fails", async () => {
    vi.mocked(messengerApi.status)
      .mockResolvedValueOnce([connected])
      .mockRejectedValueOnce(new Error("network"));
    vi.mocked(messengerApi.disconnect).mockResolvedValue(undefined);
    render(<MessengerSettings />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "Отключить Telegram" }),
    );
    expect(
      await screen.findByText(
        /Изменение сохранено, но не удалось обновить статус/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Подключить Telegram" }),
    ).not.toBeChecked();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an actual disconnect failure and keeps the previous connection", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([connected]);
    vi.mocked(messengerApi.disconnect).mockRejectedValue(
      new Error(
        "Не удалось получить ответ сервера. Обновите статус подключения.",
      ),
    );
    render(<MessengerSettings />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "Отключить Telegram" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось получить ответ сервера",
    );
    expect(
      screen.getByRole("switch", { name: "Отключить Telegram" }),
    ).toBeChecked();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

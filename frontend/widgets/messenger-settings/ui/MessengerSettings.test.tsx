import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { messengerApi } from "@/entities/messenger/api/messengers";
import { MessengerSettings } from "./MessengerSettings";
import type { MessengerStatus } from "@/entities/messenger/model/types";

vi.mock("@/entities/messenger/api/messengers", () => ({ messengerApi: {
  status: vi.fn(), link: vi.fn(), confirm: vi.fn(), disconnect: vi.fn(), notifications: vi.fn(),
} }));

const status: MessengerStatus = { platform: "TELEGRAM", configured: true, connected: false,
  displayName: null, notificationsEnabled: false, blocked: false, pending: null };

describe("MessengerSettings", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("creates a link before opening the bot and requires a separate confirmation", async () => {
    const expiresAt = new Date(Date.now() + 600000).toISOString();
    vi.mocked(messengerApi.status).mockResolvedValue([status]);
    vi.mocked(messengerApi.link).mockResolvedValue({ url: "https://t.me/zemledel_agent?start=test", expiresAt });
    render(<MessengerSettings />);
    const connect = await screen.findByRole("button", { name: "Подключить Telegram" });
    vi.mocked(messengerApi.status).mockResolvedValue([{ ...status, pending: { id: "token", displayName: null, expiresAt } }]);
    fireEvent.click(connect);
    expect(await screen.findByRole("link", { name: "Открыть Telegram" })).toHaveAttribute("href", "https://t.me/zemledel_agent?start=test");
    expect(messengerApi.confirm).not.toHaveBeenCalled();
  });

  it("only connects after confirming the presented account", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([{ ...status, pending: { id: "token", displayName: "Иван", expiresAt: new Date(Date.now() + 600000).toISOString() } }]);
    render(<MessengerSettings />);
    const confirm = await screen.findByRole("button", { name: "Подтвердить подключение" });
    expect(screen.getByText(/аккаунт «Иван»/)).toBeInTheDocument();
    vi.mocked(messengerApi.status).mockResolvedValue([{ ...status, connected: true, displayName: "Иван", notificationsEnabled: true }]);
    fireEvent.click(confirm);
    await waitFor(() => expect(messengerApi.confirm).toHaveBeenCalledWith("TELEGRAM", "token"));
    expect(await screen.findByText("Подключён")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отключить Telegram" })).toBeInTheDocument();
  });

  it("shows a failed connection request without falsely claiming success", async () => {
    vi.mocked(messengerApi.status).mockResolvedValue([status]);
    vi.mocked(messengerApi.link).mockRejectedValue(new Error("Сервис временно недоступен"));
    render(<MessengerSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Подключить Telegram" }));
    expect(await screen.findByText("Сервис временно недоступен")).toBeInTheDocument();
    expect(screen.queryByText("Подключён")).not.toBeInTheDocument();
  });
});

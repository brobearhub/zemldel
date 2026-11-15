import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestDocuments } from "./CustomerRequestDocuments";

const requests = [
  { id: "empty", serviceTitle: "Без документов", status: "ACTIVE" },
  { id: "with-files", number: 2, serviceTitle: "С документами", status: "ACTIVE", createdAt: "2026-11-12T11:45:00Z" },
] as RequestCustomerDto[];

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("CustomerRequestDocuments", () => {
  it("shows and counts only requests with documents", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(["with-files"]));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomerRequestDocuments requests={requests} loading={false} error={null} onRetry={() => {}} />);

    expect(await screen.findByRole("button", { name: /С документами/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Без документов/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 заявка")).toBeInTheDocument();
    expect(screen.getByText(/Заявка № 2 · 12\.11\.2026, \d{2}:\d{2}/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when no request has documents", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
    render(<CustomerRequestDocuments requests={requests} loading={false} error={null} onRetry={() => {}} />);

    expect(await screen.findByText(/Документов по заявкам пока нет/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Без документов|С документами/ })).not.toBeInTheDocument();
  });

  it("offers a retry instead of treating a failed check as empty", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ error: "offline" }, 503))
      .mockResolvedValueOnce(json(["with-files"]));
    vi.stubGlobal("fetch", fetchMock);
    render(<CustomerRequestDocuments requests={requests} loading={false} error={null} onRetry={() => {}} />);

    expect(await screen.findByText(/Не удалось загрузить документы по заявкам/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /С документами/ })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});


it("uses provider document APIs and request links for the provider view", async () => {
  const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(json(
    url === "/api/pro/documents/request-ids" ? ["with-files"] :
    url.endsWith("/provider-misc") ? [{ id: "provider-file", originalName: "Шаблон.xlsx", sizeBytes: 2048 }] : [],
  )));
  vi.stubGlobal("fetch", fetchMock);
  render(<CustomerRequestDocuments audience="provider" requests={requests} loading={false} error={null} onRetry={() => {}} />);
  await userEvent.setup().click(await screen.findByRole("button", { name: /С документами/ }));
  expect(await screen.findByRole("link", { name: "Скачать Шаблон.xlsx" })).toHaveAttribute("href", "/api/pro/contract-files/provider-file/download");
  expect(screen.getByRole("link", { name: "Открыть заявку" })).toHaveAttribute("href", "/pro/requests/with-files");
  expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith("/api/pro/"))).toBe(true);
});

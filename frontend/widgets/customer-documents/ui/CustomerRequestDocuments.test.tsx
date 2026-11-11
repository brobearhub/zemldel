import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerRequestDocuments } from "./CustomerRequestDocuments";

const requests = [
  { id: "empty", serviceTitle: "Без документов", status: "ACTIVE" },
  { id: "with-files", serviceTitle: "С документами", status: "ACTIVE" },
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

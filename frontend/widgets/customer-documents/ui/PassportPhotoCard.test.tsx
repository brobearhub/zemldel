import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { PassportPhotoCard } from "./PassportPhotoCard";

const photo = { id: "saved-photo", mimeType: "image/png", sizeBytes: 100, createdAt: "2026-11-06T00:00:00Z" };
const json = (data: unknown, status = 200) => Response.json(data, { status });
function mount() { return render(<ConfirmProvider><PassportPhotoCard onShare={vi.fn()} /></ConfirmProvider>); }

describe("passport photo card", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads saved photos again after remount and opens the private viewer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([photo])));
    const first = mount();
    await screen.findByRole("button", { name: "Открыть фото 1" });
    first.unmount();
    vi.mocked(fetch).mockResolvedValue(json([photo]));
    mount();
    await userEvent.click(await screen.findByRole("button", { name: "Открыть фото 1" }));
    expect(screen.getByRole("dialog", { name: "Фотография паспорта" })).toBeInTheDocument();
    expect(screen.getByAltText("Сохранённая фотография паспорта")).toHaveAttribute("src", "/api/documents/passport/photos/saved-photo");
  });

  it("keeps a failed upload selected and reuses the same upload ID on retry", async () => {
    const ids: string[] = [];
    const fetchMock = vi.fn(async (_: unknown, init?: RequestInit) => {
      if (init?.method === "POST") {
        ids.push(String((init.body as FormData).get("uploadId")));
        return ids.length === 1 ? json({ message: "Временный сбой" }, 502) : json({ ...photo, id: ids[0] }, 201);
      }
      return json([]);
    });
    vi.stubGlobal("fetch", fetchMock); mount();
    await screen.findByText("0 из 4");
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Выбрать фото паспорта"), new File(["synthetic"], "sample.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Загрузить фото" }));
    await screen.findByText("Временный сбой");
    expect(screen.getByAltText("Предпросмотр: sample.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Загрузить фото" }));
    await screen.findByText("Фотографии сохранены");
    expect(ids[0]).toBe(ids[1]);
    expect(screen.queryByAltText("Предпросмотр: sample.png")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("preserves the first saved photo when uploading the second fails", async () => {
    let uploads = 0;
    vi.stubGlobal("fetch", vi.fn(async (_: unknown, init?: RequestInit) => {
      if (init?.method !== "POST") return json([]);
      uploads += 1;
      return uploads === 1 ? json({ ...photo, id: (init.body as FormData).get("uploadId") }, 201) : json({ message: "Не удалось загрузить второе фото" }, 502);
    }));
    mount(); await screen.findByText("0 из 4");
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Выбрать фото паспорта"), [new File(["one"], "one.png", { type: "image/png" }), new File(["two"], "two.png", { type: "image/png" })]);
    await user.click(screen.getByRole("button", { name: "Загрузить фото" }));
    await screen.findByText("Не удалось загрузить второе фото");
    expect(screen.getByText("1 из 4")).toBeInTheDocument();
    expect(screen.getByAltText("Предпросмотр: two.png")).toBeInTheDocument();
    expect(screen.queryByAltText("Предпросмотр: one.png")).not.toBeInTheDocument();
  });

  it("requires confirmation and keeps a photo visible if deletion fails", async () => {
    let deletes = 0;
    vi.stubGlobal("fetch", vi.fn(async (_: unknown, init?: RequestInit) => {
      if (init?.method === "DELETE") { deletes += 1; return deletes === 1 ? json({ message: "Удаление временно недоступно" }, 502) : json({ ok: true }); }
      return json([photo]);
    }));
    mount(); const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Удалить фото паспорта 1" }));
    expect(deletes).toBe(0);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Удалить" }));
    await screen.findByText("Удаление временно недоступно");
    await user.click(await screen.findByRole("button", { name: "Удалить фото паспорта 1" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Удалить" }));
    await screen.findByText("Фотография удалена");
    expect(screen.queryByRole("button", { name: "Открыть фото 1" })).not.toBeInTheDocument();
  });

  it("disables new selection while four photos are saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(Array.from({ length: 4 }, (_, index) => ({ ...photo, id: `photo-${index}` })))));
    mount(); await screen.findByText("4 из 4");
    expect(screen.getByLabelText("Выбрать фото паспорта")).toBeDisabled();
  });
});

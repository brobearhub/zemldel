import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios, { type AxiosProgressEvent, type AxiosResponse } from "axios";
import { ConfirmProvider } from "@/shared/ui/confirm";
import { PassportPhotoCard } from "./PassportPhotoCard";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));

const photo = { id: "saved-photo", mimeType: "image/png", sizeBytes: 100, createdAt: "2026-11-06T00:00:00Z" };
const json = (data: unknown, status = 200) => Response.json(data, { status });
function mount() { return render(<ConfirmProvider><PassportPhotoCard onShare={vi.fn()} /></ConfirmProvider>); }

describe("passport photo card", () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.post).mockImplementation(async (url, body) => {
      const response = await fetch(url, { method: "POST", body: body as FormData });
      return { data: await response.json(), status: response.status } as AxiosResponse;
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows a success check for three seconds after saving, then retains the delete button", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_: unknown, init?: RequestInit) => json(init?.method === "POST" ? photo : [])));
    mount();
    await screen.findByText("0 из 4");
    fireEvent.change(screen.getByLabelText("Выбрать фото паспорта"), {
      target: { files: [new File(["photo"], "passport.png", { type: "image/png" })] },
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Загрузить фото" })); });
    expect(screen.getByRole("status", { name: "Фото паспорта 1 загружено" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить фото паспорта 1" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole("status", { name: "Фото паспорта 1 загружено" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status", { name: "Фото паспорта 1 загружено" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить фото паспорта 1" })).toBeEnabled();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("button", { name: "Удалить фото паспорта 1" })).toBeEnabled();
  });

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

  it("tracks each file, waits for server confirmation and preserves saved photos after a later failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
    let finishFirst!: (response: AxiosResponse) => void;
    let finishSecond!: (response: AxiosResponse) => void;
    vi.mocked(axios.post)
      .mockImplementationOnce(() => new Promise<AxiosResponse>(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<AxiosResponse>(resolve => { finishSecond = resolve; }));
    mount();
    await screen.findByText("0 из 4");
    const user = userEvent.setup();
    await user.upload(screen.getByLabelText("Выбрать фото паспорта"), [
      new File(["first"], "first.png", { type: "image/png" }),
      new File(["second"], "second.png", { type: "image/png" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Загрузить фото" }));

    const firstBar = screen.getByRole("progressbar", { name: "Загрузка: first.png" });
    expect(firstBar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar", { name: "Загрузка: second.png" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("В очереди")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загружаем фото…" })).toBeDisabled();
    const config = vi.mocked(axios.post).mock.calls[0][2]!;
    act(() => config.onUploadProgress!({ loaded: 3, total: 4 } as AxiosProgressEvent));
    expect(firstBar).toHaveAttribute("aria-valuenow", "75");
    act(() => config.onUploadProgress!({ loaded: 4, total: 4 } as AxiosProgressEvent));
    expect(screen.getByText("Сохраняется…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Открыть фото 1" })).not.toBeInTheDocument();

    const id = (vi.mocked(axios.post).mock.calls[0][1] as FormData).get("uploadId");
    await act(async () => { finishFirst({ data: { ...photo, id }, status: 201 } as AxiosResponse); });
    expect(screen.getByRole("button", { name: "Открыть фото 1" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Загрузка: Фото паспорта 1" })).toHaveAttribute("aria-valuenow", "100");
    const secondBar = screen.getByRole("progressbar", { name: "Загрузка: second.png" });
    const nextConfig = vi.mocked(axios.post).mock.calls[1][2]!;
    act(() => nextConfig.onUploadProgress!({ loaded: 1 } as AxiosProgressEvent));
    expect(secondBar).not.toHaveAttribute("aria-valuenow");
    await act(async () => { finishSecond({ data: { message: "Временный сбой" }, status: 502 } as AxiosResponse); });
    expect(screen.getByText("Временный сбой")).toBeInTheDocument();
    expect(screen.getByAltText("Предпросмотр: second.png")).toBeInTheDocument();
    expect(screen.getByText("В очереди — нажмите «Загрузить фото»")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Открыть фото 1" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeEnabled();
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

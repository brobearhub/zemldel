import { StrictMode } from "react";
import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
vi.mock("@/shared/lib/image/convert-to-webp", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/lib/image/convert-to-webp")>(),
  convertImageToWebp: async (file: File) => file,
}));
import userEvent from "@testing-library/user-event";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { mainService } from "@/tests/fixtures/services";
import { ProServiceEditor } from "./ProServiceEditor";
import {
  draftPhotoKey,
  readNewServiceDraft,
  serviceDraftStorageKey,
  writeNewServiceDraft,
  writeDraftPhotos,
  type NewServiceDraft,
} from "../lib/new-service-draft";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  photos: new Map<string, File[]>(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => state }));
vi.mock("@/core/store/hooks", () => ({ useAppSelector: () => ({ user: null }) }));
vi.mock("@/features/select-service-places", () => ({ ServiceGeographyField: () => null, ServicePlaceChips: () => null }));
vi.mock("../lib/new-service-draft", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/new-service-draft")>(),
  readDraftPhotos: vi.fn(async (key: string) => state.photos.get(key) ?? []),
  writeDraftPhotos: vi.fn(async (key: string, files: File[]) => { state.photos.set(key, files); }),
  removeDraftPhotos: vi.fn(async (key: string) => { state.photos.delete(key); }),
}));

const key = serviceDraftStorageKey("user-1", "provider-1");
const photo = () => new File(["original photo bytes"], "service.png", { type: "image/png", lastModified: 1234 });
const draft = (): NewServiceDraft => ({
  version: 1,
  form: {
    categoryId: mainService.categoryId,
    status: "DRAFT",
    title: "Мой черновик услуги",
    description: "Описание черновика",
    price: "23000",
    stockBadge: "Акция",
    paletteColor: "info",
  },
  places: mainService.places ?? [],
  allRussia: false,
  images: [],
  savedServiceId: null,
  photos: [draftPhotoKey(photo())],
});
function mount(storageKey = key, mode: "create" | "edit" = "create") {
  return render(
    <StrictMode>
      <ThemeProvider theme={createAppTheme("light")}>
        <ProServiceEditor
          mode={mode}
          draftStorageKey={storageKey}
          initialService={mode === "edit" ? { ...mainService, image: "https://example.com/saved.png", images: ["https://example.com/saved.png"] } : undefined}
          initialProviderCity={mainService.provider.city}
          categories={[{ id: "root-1", name: "Земельные работы", slug: "root", parentId: null, sortOrder: 1 }, mainService.category]}
        />
      </ThemeProvider>
    </StrictMode>,
  );
}
function seed(storageKey = key, value = draft()) {
  writeNewServiceDraft(storageKey, value);
  state.photos.set(storageKey, [photo()]);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.photos.clear();
  let id = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => `blob:restored-${id++}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ entitlementPlan: "BUSINESS", limits: { photos: 10 } })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("automatically restores incomplete fields and original selected photos after reopening", async () => {
  const first = mount();
  await userEvent.type(screen.getByRole("textbox", { name: "Название" }), "Незавершённая услуга");
  await userEvent.type(screen.getByRole("textbox", { name: /Описание/ }), "Текст после повторного входа");
  const cover = new File(["cover bytes"], "cover.png", { type: "image/png", lastModified: 1234 });
  await userEvent.upload(screen.getByLabelText("Фотографии услуги"), [photo(), cover]);
  await userEvent.click(screen.getByRole("button", { name: "Сделать главной фото 2" }));
  await waitFor(() => expect(state.photos.get(key)?.map((file) => file.name)).toEqual(["cover.png", "service.png"]));
  expect(readNewServiceDraft(key)?.form.title).toBe("Незавершённая услуга");
  first.unmount();
  mount();
  await screen.findByText(/Черновик восстановлен/);
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue("Незавершённая услуга");
  expect(screen.getByRole("textbox", { name: /Описание/ })).toHaveValue("Текст после повторного входа");
  expect(screen.getByRole("textbox", { name: "Цена" })).toHaveValue("");
  expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", expect.stringMatching(/^blob:restored-/));
  expect(readNewServiceDraft(key)?.photos).toEqual([draftPhotoKey(cover), draftPhotoKey(photo())]);
  expect(readNewServiceDraft(key)?.mainPhotoKey).toBe(draftPhotoKey(cover));
  expect(screen.getAllByText("Главная")).toHaveLength(1);
});

it("clears both stores only after successful publication and does not recreate the draft", async () => {
  seed();
  const calls: Array<{ url: string; method?: string }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method });
    if (String(url).endsWith("/image")) {
      expect((init?.body as FormData).get("file")).toMatchObject({ name: "service.png", size: photo().size });
      return Response.json({ image: "https://example.com/photo.png", images: ["https://example.com/photo.png"] });
    }
    expect(localStorage.getItem(key)).not.toBeNull();
    return Response.json({ ...mainService, id: "created-id" });
  }));
  const first = mount();
  await screen.findByText(/Черновик восстановлен/);
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/pro/services?notice=published&serviceId=created-id"));
  expect(localStorage.getItem(key)).toBeNull();
  expect(state.photos.has(key)).toBe(false);
  expect(calls.map((call) => call.method)).toEqual(["POST", "POST", "PATCH"]);
  first.unmount();
  mount();
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue("");
  expect(screen.queryByAltText("Фото услуги 1")).not.toBeInTheDocument();
});

it("resumes the same server draft after upload failure and reopening", async () => {
  seed();
  let fails = true;
  const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
    if (String(url).endsWith("/image")) {
      if (fails) return Response.json({ error: "Сбой загрузки" }, { status: 502 });
      return Response.json({ image: "https://example.com/photo.png", images: ["https://example.com/photo.png"] });
    }
    if (init?.method) return Response.json({ ...mainService, id: "created-id" });
    return Response.json({ entitlementPlan: "BUSINESS", limits: { photos: 10 } });
  });
  vi.stubGlobal("fetch", fetchMock);
  const first = mount();
  await screen.findByText(/Черновик восстановлен/);
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await screen.findByText("Сбой загрузки");
  expect(readNewServiceDraft(key)?.savedServiceId).toBe("created-id");
  expect(state.photos.get(key)).toHaveLength(1);
  first.unmount();
  fails = false;
  mount();
  await screen.findByText(/Черновик восстановлен/);
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await waitFor(() => expect(state.push).toHaveBeenCalled());
  expect(fetchMock.mock.calls.filter(([url]) => url === "/api/pro/services")).toHaveLength(1);
  expect(localStorage.getItem(key)).toBeNull();
});

it("isolates drafts by user and provider and leaves unrelated drafts on edit publication", async () => {
  seed();
  const second = mount(serviceDraftStorageKey("user-2", "provider-1"));
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue("");
  expect(screen.queryByAltText("Фото услуги 1")).not.toBeInTheDocument();
  second.unmount();
  mount(key, "edit");
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue(mainService.title);
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await waitFor(() => expect(state.push).toHaveBeenCalled());
  expect(readNewServiceDraft(key)?.form.title).toBe("Мой черновик услуги");
});

it("clears the matching local draft when publishing from its edit page", async () => {
  seed(key, { ...draft(), savedServiceId: mainService.id });
  mount(key, "edit");
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await waitFor(() => expect(state.push).toHaveBeenCalled());
  expect(localStorage.getItem(key)).toBeNull();
  expect(state.photos.has(key)).toBe(false);
});

it("keeps the form usable and reports photo storage failures", async () => {
  vi.mocked(writeDraftPhotos).mockRejectedValueOnce(new Error("Quota exceeded"));
  mount();
  await userEvent.type(screen.getByRole("textbox", { name: "Название" }), "Сохранить текст");
  await userEvent.upload(screen.getByLabelText("Фотографии услуги"), photo());
  await screen.findByText(/фотографии сохранить не удалось/);
  expect(readNewServiceDraft(key)?.form.title).toBe("Сохранить текст");
  expect(screen.getByRole("textbox", { name: "Название" })).toBeEnabled();
});

it("ignores damaged storage and explains missing photo files without losing text", async () => {
  localStorage.setItem(key, "{broken");
  const first = mount();
  await screen.findByText("Не удалось прочитать черновик в этом браузере.");
  expect(screen.getByRole("textbox", { name: "Название" })).toBeEnabled();
  first.unmount();
  seed();
  state.photos.clear();
  mount();
  await screen.findByText(/часть фотографий недоступна/);
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue("Мой черновик услуги");
  expect(screen.queryByAltText("Фото услуги 1")).not.toBeInTheDocument();
});

it("keeps uploaded photos after failed publication and does not upload them again after reopening", async () => {
  seed();
  let publications = 0;
  const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
    if (String(url).endsWith("/image")) return Response.json({ image: "https://example.com/photo.png", images: ["https://example.com/photo.png"] });
    if (init?.method === "PATCH" && ++publications === 1) return Response.json({ error: "Публикация не удалась" }, { status: 502 });
    return Response.json({ ...mainService, id: "created-id" });
  });
  vi.stubGlobal("fetch", fetchMock);
  const first = mount();
  await screen.findByText(/Черновик восстановлен/);
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await screen.findByText("Публикация не удалась");
  expect(readNewServiceDraft(key)).toMatchObject({ savedServiceId: "created-id", images: ["https://example.com/photo.png"], photos: [] });
  first.unmount();
  mount();
  await screen.findByText(/Черновик восстановлен/);
  await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
  await waitFor(() => expect(state.push).toHaveBeenCalled());
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/image"))).toHaveLength(1);
  expect(localStorage.getItem(key)).toBeNull();
});

it("reports localStorage quota errors without disabling editing or publication", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
  mount();
  await userEvent.type(screen.getByRole("textbox", { name: "Название" }), "Черновик" );
  await screen.findByText(/Не удалось сохранить черновик в этом браузере/);
  expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue("Черновик");
  expect(screen.getAllByRole("button", { name: "Опубликовать" })[0]).toBeEnabled();
});

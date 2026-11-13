import { StrictMode } from "react";
import { ThemeProvider } from "@mui/material";
import { act, render, screen, waitFor } from "@testing-library/react";
import { convertImageToWebp } from "@/shared/lib/image/convert-to-webp";
vi.mock("@/shared/lib/image/convert-to-webp", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/shared/lib/image/convert-to-webp")>(),
  convertImageToWebp: vi.fn(async (file: File) => file),
}));
import userEvent from "@testing-library/user-event";
import { createAppTheme } from "@/core/theme/createAppTheme";
import { createSessionRecoveryFetch } from "@/core/auth/session-recovery";
import { mainService } from "@/tests/fixtures/services";
import { ProServiceEditor } from "./ProServiceEditor";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/core/store/hooks", () => ({ useAppSelector: () => ({ user: null }) }));
vi.mock("@/features/select-service-places", () => ({ ServiceGeographyField: () => null, ServicePlaceChips: () => null }));
const billing = {
  plan: "STANDARD",
  entitlementPlan: "BUSINESS",
  limits: { photos: 10, regions: null },
};
const readResponse = (url: unknown) => Response.json(String(url).includes("/api/billing/") ? billing : []);
const pictures = (count: number) => Array.from({ length: count }, (_, i) => `https://example.com/photo-${i}.png`);
const files = (count: number) => Array.from({ length: count }, (_, i) => new File([`photo${i}`], `photo-${i}.png`, { type: "image/png" }));
function mount(
  images: string[] = [],
  mode: "create" | "edit" = "edit",
  empty = false,
  overrides: Partial<typeof mainService> = {},
) {
  return render(
    <StrictMode>
      <ThemeProvider theme={createAppTheme("light")}>
        <ProServiceEditor
          mode={mode}
          initialService={empty ? undefined : { ...mainService, image: images[0] ?? null, images, ...overrides }}
          initialProviderCity={mainService.provider.city}
          categories={[
            {
              id: "root-1",
              name: "Земельные работы",
              slug: "zemelnye-raboty",
              parentId: null,
              sortOrder: 1,
            },
            mainService.category,
          ]}
        />
      </ThemeProvider>
    </StrictMode>,
  );
}

describe("service photo gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let id = 0;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => `blob:photo-${id++}`) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows progress while converting and uploads the resulting WebP", async () => {
    let complete!: (file: File) => void;
    vi.mocked(convertImageToWebp).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const fetchMock = vi.fn(async (url: unknown, _init?: RequestInit) =>
      String(url).endsWith("/image")
        ? Response.json({ image: pictures(1)[0], images: pictures(1) })
        : readResponse(url),
    );
    vi.stubGlobal("fetch", fetchMock);
    mount();

    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    expect(screen.getByText("Обрабатываем и загружаем фото…")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/image"))).toBe(false);
    const converted = new File(["webp"], "photo-0.webp", { type: "image/webp" });
    await act(async () => complete(converted));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/image"));
      expect(call).toBeDefined();
      expect((call?.[1]?.body as FormData).get("file")).toBe(converted);
    });
  });

  it("publishes a new service after selecting a photo and filling the empty form", async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        return Response.json({ image: pictures(1)[0], images: pictures(1) });
      }
      if (init?.method === "POST") {
        return Response.json({ ...mainService, id: "created-service" });
      }
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create", true);
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    expect(screen.getByText("Обложка")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox", { name: /Категория/ }));
    await userEvent.click(screen.getByRole("option", { name: new RegExp(mainService.category.name) }));
    await userEvent.type(screen.getByRole("textbox", { name: "Цена" }), "15000");
    await userEvent.type(screen.getByRole("textbox", { name: /Описание/ }), "Описание услуги");
    expect(screen.getByRole("textbox", { name: "Название" })).toHaveValue(mainService.category.name);
    expect(screen.getByRole("textbox", { name: "Цена" })).toHaveValue("15 000");
    expect(screen.getByRole("textbox", { name: /Описание/ })).toHaveValue("Описание услуги");
    const publish = screen.getAllByRole("button", { name: "Опубликовать" })[0];
    expect(publish).toBeEnabled();
    await userEvent.click(publish);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/pro/services?notice=published&serviceId=created-service"));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
    const writes = fetchMock.mock.calls.filter(([, init]) => init?.method);
    expect(writes.map(([url, init]) => [url, init?.method])).toEqual([
      ["/api/pro/services", "POST"],
      ["/api/pro/services/created-service/image", "POST"],
      ["/api/pro/services/created-service", "PATCH"],
    ]);
    expect(JSON.parse(String(writes[0][1]?.body))).toMatchObject({ status: "DRAFT" });
    expect(JSON.parse(String(writes[2][1]?.body))).toEqual({ status: "PUBLISHED" });
  });

  it("explains incomplete fields on publish without treating a selected photo as missing", async () => {
    const fetchMock = vi.fn(async (url: unknown) => readResponse(url));
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create", true);
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    await userEvent.type(screen.getByRole("textbox", { name: /Описание/ }), "Описание услуги");
    const publish = screen.getAllByRole("button", { name: "Опубликовать" })[0];
    expect(publish).toBeEnabled();
    await userEvent.click(publish);
    expect(screen.getByRole("alert")).toHaveTextContent("Укажите название услуги. Укажите цену. Выберите категорию.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Добавьте фото.");
    expect(screen.queryByText(/Для публикации:.*Добавьте фото/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole("textbox", { name: "Название" }), "Межевание");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Укажите название услуги.");
    await userEvent.type(screen.getByRole("textbox", { name: "Цена" }), "15000");
    await userEvent.click(screen.getByRole("combobox", { name: /Категория/ }));
    await userEvent.click(screen.getByRole("option", { name: new RegExp(mainService.category.name) }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a new service in draft on upload failure and publishes it after retry without duplicates", async () => {
    let uploads = 0;
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        uploads++;
        if (uploads === 1) return Response.json({ error: "Не удалось загрузить фото" }, { status: 502 });
        return Response.json({ image: pictures(1)[0], images: pictures(1) });
      }
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await screen.findByText("Не удалось загрузить фото");
    expect(screen.getByText("Обложка · Не загружено")).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
    const creates = fetchMock.mock.calls.filter(([url]) => url === "/api/pro/services");
    expect(creates).toHaveLength(1);
    expect(JSON.parse(String(creates[0][1]?.body))).toMatchObject({ status: "DRAFT" });

    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/pro/services?notice=published&serviceId=created-service"));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/pro/services")).toHaveLength(1);
    expect(uploads).toBe(2);
    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patches).toHaveLength(1);
    expect(JSON.parse(String(patches[0][1]?.body))).toMatchObject({ status: "PUBLISHED", images: pictures(1) });
  });

  it("retries publication without reuploading a successfully saved photo", async () => {
    let publications = 0;
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        return Response.json({ image: pictures(1)[0], images: pictures(1) });
      }
      if (init?.method === "PATCH") {
        publications++;
        if (publications === 1) return Response.json({ error: "Не удалось опубликовать" }, { status: 502 });
      }
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await screen.findByText("Не удалось опубликовать");
    expect(screen.getByText("Обложка")).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/pro/services?notice=published&serviceId=created-service"));
    expect(publications).toBe(2);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
  });

  it("uses saved gallery photos for both the preview and publication when the legacy cover is empty", async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (init?.method === "PATCH") return Response.json(mainService);
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount(pictures(1), "edit", false, { image: null });
    expect(screen.queryByRole("button", { name: "Загрузите фото" })).not.toBeInTheDocument();
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", pictures(1)[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(`/pro/services?notice=published&serviceId=${mainService.id}`));
    const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patches).toHaveLength(1);
    expect(JSON.parse(String(patches[0][1]?.body))).toMatchObject({ status: "PUBLISHED", images: pictures(1) });
  });

  it("marks the selected saved photo as main and publishes it as the cover", async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (init?.method) return Response.json(mainService);
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    const gallery = pictures(3);
    mount(gallery);
    expect(screen.getAllByText("Главная")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Сделать главной фото 3" }));
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", gallery[2]);
    expect(screen.getAllByText("Главная")).toHaveLength(1);
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({ images: [gallery[2], gallery[0], gallery[1]] });
  });

  it("uploads the chosen new cover first and keeps it main after later uploads", async () => {
    const uploaded: string[] = [];
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        const file = (init?.body as FormData).get("file") as File;
        uploaded.push(file.name);
        const gallery = uploaded.map((name) => `https://example.com/${name}`);
        return Response.json({ image: gallery[0], images: gallery });
      }
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(3));
    const chosen = screen.getByAltText("Фото услуги 3").getAttribute("src");
    await userEvent.click(screen.getByRole("button", { name: "Сделать главной фото 3" }));
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", chosen);
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(uploaded).toEqual(["photo-2.png", "photo-0.png", "photo-1.png"]);
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", "https://example.com/photo-2.png");
  });

  it("keeps a newly selected cover when an earlier photo has already uploaded before a failure", async () => {
    const gallery: string[] = [];
    let uploads = 0;
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        if (++uploads === 2) return Response.json({ error: "Сбой второго фото" }, { status: 502 });
        const file = (init?.body as FormData).get("file") as File;
        gallery.push(`https://example.com/${file.name}`);
        return Response.json({ image: gallery[0], images: gallery });
      }
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(3));
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await screen.findByText("Сбой второго фото");
    const chosen = screen.getByAltText("Фото услуги 3").getAttribute("src");
    await userEvent.click(screen.getByRole("button", { name: "Сделать главной фото 3" }));
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", chosen);
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({
      images: ["https://example.com/photo-2.png", "https://example.com/photo-0.png", "https://example.com/photo-1.png"],
    });
  });

  it("selects the existing photo when the chosen file was already stored during an earlier attempt", async () => {
    const hash = "ab".repeat(32);
    const gallery = [`https://example.com/first.png`, `https://example.com/${hash}.png`];
    vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).fill(0xab).buffer) } });
    const selected = files(3);
    Object.defineProperty(selected[2], "arrayBuffer", { value: async () => new ArrayBuffer(1) });
    let uploads = 0;
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        if (++uploads === 3) return Response.json({ error: "Сбой третьего фото" }, { status: 502 });
        return Response.json({ image: gallery[0], images: gallery.slice(0, Math.min(uploads, 2)) });
      }
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), selected);
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await screen.findByText("Сбой третьего фото");
    await userEvent.click(screen.getByRole("button", { name: "Сделать главной фото 3" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({ images: [gallery[1], gallery[0]] });
  });

  it("recovers a 401 during photo upload without losing the file or creating another service", async () => {
    let uploads = 0;
    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        expect((init?.body as FormData).get("file")).toMatchObject({ name: "photo-0.png", size: 6 });
        uploads++;
        if (uploads === 1) return Response.json({ error: "Unauthorized" }, { status: 401 });
        return Response.json({ image: pictures(1)[0], images: pictures(1) });
      }
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    });
    const getSession = vi.fn(async () => ({ user: { id: "provider-user" } }));
    const redirect = vi.fn();
    vi.stubGlobal("fetch", createSessionRecoveryFetch({
      fetch: fetchMock,
      getSession,
      pathname: () => "/pro/services/create",
      returnTo: () => "/pro/services/create",
      origin: () => "http://localhost:4000",
      redirect,
    }));
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/pro/services?notice=published&serviceId=created-service"));
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
    expect(uploads).toBe(2);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/pro/services")).toHaveLength(1);
  });

  it.each([
    [401, { error: "Unauthorized" }, "Сессия завершена."],
    [403, { error: "Forbidden" }, "Нет доступа к изменению услуги."],
    [400, { error: "Bad Request", message: "Превышен лимит фотографий" }, "Превышен лимит фотографий"],
    [200, {}, "Сервер не подтвердил загрузку фотографии."],
  ])("preserves the selected file and explains upload response %s", async (status, body, message) => {
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) return Response.json(body, { status });
      if (init?.method) return Response.json({ ...mainService, id: "created-service" });
      return readResponse(url);
    }));
    mount([], "create");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(1));
    await userEvent.click(screen.getAllByRole("button", { name: "Опубликовать" })[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", "blob:photo-0");
    expect(screen.getByRole("button", { name: "Повторить загрузку" })).toBeEnabled();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("accepts ten selected images in a new service and disables additional selection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: unknown) => readResponse(url)));
    mount([], "create");
    await screen.findByText("Фотографии услуги · 0 из 10");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(10));
    expect(screen.getByText("Фотографии услуги · 10 из 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Фотографии услуги")).toBeDisabled();
    expect(screen.getAllByAltText(/^Фото услуги /)).toHaveLength(10);
    await userEvent.click(screen.getByRole("button", { name: "Удалить фото услуги 4" }));
    expect(screen.getByText("Фотографии услуги · 9 из 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Фотографии услуги")).toBeEnabled();
  });

  it("rejects a batch exceeding ten without losing saved photos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: unknown) => readResponse(url)));
    mount(pictures(9));
    await screen.findByText("Фотографии услуги · 9 из 10");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(2));
    expect(screen.getByText("Тариф позволяет загрузить не более 10 фотографий.")).toBeInTheDocument();
    expect(screen.getByText("Фотографии услуги · 9 из 10")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.filter(([, init]: [unknown, RequestInit?]) => init?.method === "POST")).toHaveLength(0);
  });

  it("keeps successful uploads and retries only the failed file", async () => {
    const images = pictures(8);
    let uploads = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      if (init?.method !== "POST") return readResponse(url);
      uploads++;
      if (uploads === 2) return Response.json({ error: "Временный сбой" }, { status: 502 });
      images.push(`https://example.com/new-${uploads}.png`);
      return Response.json({ image: images[0], images });
    }));
    mount([...images]);
    await screen.findByText("Фотографии услуги · 8 из 10");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(2));
    await screen.findByText("Временный сбой");
    await userEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Повторить загрузку" })).not.toBeInTheDocument());
    expect(uploads).toBe(3);
    expect(screen.getByText("Фотографии услуги · 10 из 10")).toBeInTheDocument();
  });

  it("deletes the selected photo and uses the returned cover", async () => {
    const images = pictures(3);
    const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        expect(String(url)).toContain(new URLSearchParams({ imageUrl: images[0] }).toString());
        return Response.json({ image: images[1], images: images.slice(1) });
      }
      return readResponse(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    mount(images);
    await screen.findByText("Фотографии услуги · 3 из 10");
    await userEvent.click(screen.getByRole("button", { name: "Удалить фото услуги 1" }));
    await screen.findByText("Фотографии услуги · 2 из 10");
    expect(screen.getByAltText("Фото услуги 1")).toHaveAttribute("src", images[1]);
  });
  it("reuses the created service after a partial upload failure", async () => {
    let creates = 0;
    let uploads = 0;
    const images: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init?: RequestInit) => {
      if (String(url).endsWith("/image")) {
        uploads++;
        if (uploads === 2) return Response.json({ error: "Временный сбой" }, { status: 502 });
        images.push(`https://example.com/upload-${uploads}.png`);
        return Response.json({ image: images[0], images });
      }
      if (init?.method === "POST") { creates++; return Response.json({ ...mainService, id: "created-service" }); }
      if (init?.method === "PATCH") {
        expect(String(url)).toBe("/api/pro/services/created-service");
        expect(JSON.parse(String(init.body))).not.toHaveProperty("image");
        return Response.json({ ...mainService, id: "created-service" });
      }
      return readResponse(url);
    }));
    mount([], "create");
    await screen.findByText("Фотографии услуги · 0 из 10");
    await userEvent.upload(screen.getByLabelText("Фотографии услуги"), files(2));
    await userEvent.click(screen.getAllByRole("button", { name: "Черновик" })[0]);
    await screen.findByText("Временный сбой");
    expect(navigation.push).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole("button", { name: "Черновик" })[0]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    expect(creates).toBe(1);
    expect(uploads).toBe(3);
  });

  it("explains the Standard photo limit instead of disabling the visible upload action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: unknown) => Response.json(String(url).includes("/api/billing/") ? { entitlementPlan: "STANDARD", limits: { photos: 1 } } : [])));
    mount(pictures(1));
    await screen.findByText("Фотографии услуги · 1 из 1");
    const action = screen.getByRole("button", { name: "Добавить фотографии" });
    expect(action).not.toBeDisabled();
    await userEvent.click(action);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("До 3 фото — на Лайте, до 10 — на Бизнесе");
    expect(screen.getByRole("link", { name: "Перейти к тарифам" })).toHaveAttribute("href", "/pro/settings/tariff");
  });

});

import { ThemeProvider } from "@mui/material";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppTheme } from "@/core/theme/createAppTheme";
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
function mount(images: string[] = [], mode: "create" | "edit" = "edit") {
  return render(
    <ThemeProvider theme={createAppTheme("light")}>
      <ProServiceEditor
        mode={mode}
        initialService={{ ...mainService, image: images[0] ?? null, images }}
        initialProviderCity={mainService.provider.city}
      />
    </ThemeProvider>,
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

});

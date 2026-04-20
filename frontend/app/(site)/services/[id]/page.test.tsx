import ServicePage, { generateMetadata } from "./page";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("@/lib/backend-api", () => {
  class MockBackendApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.status = status;
      this.body = body;
    }
  }

  return {
    __esModule: true,
    BackendApiError: MockBackendApiError,
    fetchBackendJson: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  __esModule: true,
  getServerAuthSession: vi.fn(),
}));

import { BackendApiError, fetchBackendJson } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

const mockedFetchBackendJson = vi.mocked(fetchBackendJson);
const mockedGetServerAuthSession = vi.mocked(getServerAuthSession);

describe("Service details page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetServerAuthSession.mockResolvedValue(null);
  });

  it("returns fallback metadata when service is missing", async () => {
    mockedFetchBackendJson.mockRejectedValue(new BackendApiError("Not found", 404, { error: "Not found" }));

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "missing" }),
    });

    expect(metadata).toEqual({ title: "Услуга" });
  });

  it("returns service metadata when service exists", async () => {
    mockedFetchBackendJson.mockResolvedValue({
      title: "Межевание участка",
      description: "Полное сопровождение",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "svc-1" }),
    });

    expect(metadata).toEqual({
      title: "Межевание участка — Новые горизонты",
      description: "Полное сопровождение",
    });
  });

  it("calls notFound when page service is missing", async () => {
    mockedFetchBackendJson.mockRejectedValue(new BackendApiError("Not found", 404, { error: "Not found" }));

    await expect(
      ServicePage({
        params: Promise.resolve({ id: "missing" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders page when service exists", async () => {
    mockedFetchBackendJson.mockResolvedValue({
      id: "svc-1",
      category: "main",
      title: "Межевание участка",
      description: "Описание",
      price: "1000 ₽",
      ctaText: "Записаться",
      ctaHref: "#contacts",
      image: null,
    });

    const element = await ServicePage({
      params: Promise.resolve({ id: "svc-1" }),
    });

    expect(element).toBeTruthy();
  });
});

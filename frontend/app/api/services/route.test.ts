/** @vitest-environment node */

import { GET } from "./route";

vi.mock("@/shared/api/backend/server", () => ({
  __esModule: true,
  fetchBackend: vi.fn(),
}));

import { fetchBackend } from "@/shared/api/backend/server";
import { legalService, mainService } from "@/tests/fixtures/services";

const mockedFetchBackend = vi.mocked(fetchBackend);

describe("GET /api/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns services", async () => {
    const rows = [mainService, legalService];
    mockedFetchBackend.mockResolvedValue(
      new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await GET(new Request("http://localhost/api/services"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(rows);
    expect(mockedFetchBackend).toHaveBeenCalledWith("/services");
  });

  it("forwards providerId to the public catalog", async () => {
    mockedFetchBackend.mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const providerId = "11111111-1111-4111-8111-111111111111";
    const response = await GET(
      new Request(`http://localhost/api/services?providerId=${providerId}`)
    );

    expect(response.status).toBe(200);
    expect(mockedFetchBackend).toHaveBeenCalledWith(`/services?providerId=${providerId}`);
  });

  it("returns 500 when repository throws", async () => {
    mockedFetchBackend.mockRejectedValue(new Error("backend down"));

    const response = await GET(new Request("http://localhost/api/services"));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Не удалось загрузить услуги" });
  });
});

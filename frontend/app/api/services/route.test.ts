/** @vitest-environment node */

import { GET } from "./route";

vi.mock("@/lib/backend-api", () => ({
  __esModule: true,
  fetchBackend: vi.fn(),
}));

import { fetchBackend } from "@/lib/backend-api";
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

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(rows);
    expect(mockedFetchBackend).toHaveBeenCalledWith("/services");
  });

  it("returns 500 when repository throws", async () => {
    mockedFetchBackend.mockRejectedValue(new Error("backend down"));

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch services" });
  });
});

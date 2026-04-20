/** @vitest-environment node */

import { GET } from "./route";

vi.mock("@/lib/backend-api", () => ({
  __esModule: true,
  fetchBackendAsUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  __esModule: true,
  getServerAuthSession: vi.fn(),
}));

import { fetchBackendAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";

const mockedFetchBackendAsUser = vi.mocked(fetchBackendAsUser);
const mockedGetServerAuthSession = vi.mocked(getServerAuthSession);

describe("GET /api/pro/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    mockedGetServerAuthSession.mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns provider orders for authenticated user", async () => {
    const payload = [{ id: "order-1", status: "ACTIVE" }];
    mockedGetServerAuthSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockedFetchBackendAsUser.mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(payload);
    expect(mockedFetchBackendAsUser).toHaveBeenCalledWith("/pro/orders", "user-1");
  });
});

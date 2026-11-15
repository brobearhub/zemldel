/** @vitest-environment node */

import { getServerAuthSession } from "@/core/auth";
import { fetchBackendAsUser } from "@/shared/api/backend/server";
import { GET } from "./route";

vi.mock("@/core/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/shared/api/backend/server", () => ({ fetchBackendAsUser: vi.fn() }));

describe("GET /api/pro/requests/feed rate limits", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: {
        id: "session-user",
        person: null,
        systemRole: "CUSTOMER",
        accountKind: "PROVIDER",
        activeProviderId: "provider",
        phone: null,
        customerCity: null,
        memberships: [],
      },
      expires: "2099-01-01",
    });
  });

  it("forwards 429 and Retry-After using the session identity", async () => {
    const payload = { statusCode: 429, message: "Слишком много запросов" };
    vi.mocked(fetchBackendAsUser).mockResolvedValue(
      Response.json(payload, { status: 429, headers: { "Retry-After": "10" } }),
    );
    const response = await GET(new Request(
      "http://localhost/api/pro/requests/feed?scope=free&limit=5",
      { headers: { "x-internal-auth": "forged", "x-user-id": "another-user" } },
    ));

    expect(fetchBackendAsUser).toHaveBeenCalledWith(
      "/pro/requests/feed?scope=free&limit=5", "session-user",
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(await response.json()).toEqual(payload);
  });

  it("does not call the backend for an unauthenticated visitor", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/pro/requests/feed?scope=free"));
    expect(response.status).toBe(401);
    expect(fetchBackendAsUser).not.toHaveBeenCalled();
  });
});
